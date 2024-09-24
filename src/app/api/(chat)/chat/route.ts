import { NextResponse } from 'next/server';
import { StreamingTextResponse, LangChainStream } from 'ai';
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { Document } from "@langchain/core/documents";
import { Tool } from "@langchain/core/tools";
import fs from 'fs';
import path from 'path';
// import { AIMessageChunker } from "@langchain/core/messages";

let embeddings: GoogleGenerativeAIEmbeddings;
let vectorStore: QdrantVectorStore;

async function initializeEmbeddingsAndVectorStore() {
  if (!embeddings || !vectorStore) {
    console.log('Initializing embeddings and vector store');
    embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: "embedding-001"
    });

    vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: process.env.QDRANT_URL,
      collectionName: "github_files",
      apiKey: process.env.QDRANT_API_KEY,
    });
    console.log('Vector store initialized');
  }
}

// Add this new tool for code analysis
class CodeAnalysisTool extends Tool {
  name = "code_analysis";
  description = "Analyzes code complexity, project structure, and main features";

  async _call(input: string) {
    const projectStructure = this.analyzeProjectStructure();
    const mainFeatures = this.identifyMainFeatures();

    return `Code analysis for: ${input}
    
Project Structure:
${projectStructure}

Main Features:
${mainFeatures}

Complexity: Medium (estimated)
Architecture: Next.js application with API routes`;
  }

  private analyzeProjectStructure(): string {
    const rootDir = process.cwd();
    return this.getDirectoryStructure(rootDir, 0, 2);
  }

  private getDirectoryStructure(dir: string, level: number, maxDepth: number): string {
    if (level > maxDepth) return '';

    let result = '';
    const files = fs.readdirSync(dir);

    for (const file of files) {
      if (file.startsWith('.') || file === 'node_modules') continue;

      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const indent = '  '.repeat(level);

      if (stats.isDirectory()) {
        result += `${indent}- ${file}/\n`;
        result += this.getDirectoryStructure(filePath, level + 1, maxDepth);
      } else {
        result += `${indent}- ${file}\n`;
      }
    }

    return result;
  }

  private identifyMainFeatures(): string {
    return `- GitHub repository integration
- AI-powered chat interface
- Vector store for efficient code search
- API routes for various functionalities
- Admin tools for database management`;
  }
}

const SYSTEM_TEMPLATE = `
You are an AI assistant for a GitHub repository. Your primary goal is to provide accurate, helpful information with a focus on code.

Instructions:
1. Use the provided context, search results, and code analysis to answer the question.
2. If you don't know the answer, say so. Never make up information.
3. Provide specific details and always include relevant code snippets when possible.
4. For code snippets, focus on the most important parts. Don't provide entire files unless specifically asked.
5. For backend API questions, emphasize API routes, functionality, and crucial implementation details.
6. Explain complex concepts clearly and concisely.
7. If referencing files or functions, always mention their names and locations.
8. Format your response in Markdown, using appropriate syntax for headings, lists, and code blocks.
9. For questions about code complexity, project structure, or main features, use the code analysis results.
10. When discussing project structure, refer to the provided directory tree in the code analysis.

Context:
{context}

Search Results:
{search_results}

Code Analysis:
{code_analysis}

Question: {question}

Answer (including relevant code snippets, formatted in Markdown):
`;

const formatResponse = (content: string, searchResults: string): AIMessage => {
  const baseContent = [
    { type: "text", text: content },
    { type: "text", text: "\n\n### References\n" },
    { type: "text", text: searchResults },
  ];
  
  return new AIMessage({ content: baseContent });
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages;
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 });
    }

    const query = lastMessage.content;

    await initializeEmbeddingsAndVectorStore();
    if (!embeddings || !vectorStore) {
      throw new Error('Embeddings or vector store not initialized');
    }

    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: "gemini-pro",
      streaming: true,
    });

    const retriever = vectorStore.asRetriever({ searchType: "similarity", k: 5 });
    const prompt = PromptTemplate.fromTemplate(SYSTEM_TEMPLATE);

    const tavilySearch = new TavilySearchResults({
      apiKey: process.env.TAVILY_API_KEY,
      maxResults: 3,
    });

    const codeAnalysisTool = new CodeAnalysisTool();

    const { stream, handlers } = LangChainStream();

    const chain = RunnableSequence.from([
      {
        context: async (input: { question: string }) => {
          const relevantDocs = await retriever.invoke(input.question);
          return relevantDocs.map((doc: Document) => 
            `File: ${doc.metadata.source}\n${doc.pageContent}`
          ).join("\n\n");
        },
        search_results: async (input: { question: string }) => {
          const searchResponse = await tavilySearch.invoke(input.question);
          if (Array.isArray(searchResponse)) {
            return searchResponse.map((r: any) => `- ${r.title}: ${r.url}`).join("\n");
          } else if (searchResponse && Array.isArray(searchResponse.results)) {
            return searchResponse.results.map((r: any) => `- ${r.title}: ${r.url}`).join("\n");
          } else {
            console.warn('Unexpected Tavily search response format:', searchResponse);
            return "No search results available.";
          }
        },
        code_analysis: async (input: { question: string }) => {
          return await codeAnalysisTool.invoke(input.question);
        },
        question: (input: { question: string }) => input.question,
      },
      prompt,
      model,
    ]);

    // Start the chain without waiting for it to finish
    chain.invoke({ question: query }, { callbacks: [handlers] });

    // Return the stream response
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error processing chat query:', error);
    const { message, details } = formatError(error);
    return NextResponse.json({ error: 'Failed to process chat query', message, details }, { status: 500 });
  }
}

function formatError(error: unknown): { message: string; details: Record<string, unknown> } {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: { name: error.name, stack: error.stack },
    };
  }
  if (typeof error === 'string') {
    return { message: error, details: {} };
  }
  if (typeof error === 'object' && error !== null) {
    return { message: 'Unknown error object', details: error as Record<string, unknown> };
  }
  return { message: 'An unknown error occurred', details: {} };
}
