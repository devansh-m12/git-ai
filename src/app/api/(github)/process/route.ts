import { NextResponse } from 'next/server';
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Octokit } from "@octokit/rest";

// Add this new function at the top of the file
function preprocessRepoLink(url: string): string {
  // Remove trailing slash and .git if present
  url = url.replace(/\/?(\.git)?\s*$/, '');
  
  // Extract owner and repo name from various possible input formats
  let match = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/?([\w-]+)\/([\w.-]+)/i);
  
  if (!match) {
    // If no match, assume it's just "owner/repo"
    match = url.match(/([\w-]+)\/([\w.-]+)/);
  }
  
  if (match) {
    const [, owner, repo] = match;
    return `https://github.com/${owner}/${repo}`;
  }
  
  // If we can't parse it, return the original URL
  return url;
}

let embeddings: GoogleGenerativeAIEmbeddings;
let vectorStore: QdrantVectorStore;

async function initializeEmbeddingsAndVectorStore() {
  try {
    if (!embeddings) {
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY is not set');
      }
      embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: "embedding-001"
      });
    }

    if (!vectorStore) {
      if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
        throw new Error('QDRANT_URL or QDRANT_API_KEY is not set');
      }
      vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
        url: process.env.QDRANT_URL,
        collectionName: "github_files",
        apiKey: process.env.QDRANT_API_KEY,
      });
    }
  } catch (error) {
    console.error('Error initializing embeddings or vector store:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
    }

    // Preprocess the repository link
    const processedUrl = preprocessRepoLink(url);

    await initializeEmbeddingsAndVectorStore();

    if (!embeddings || !vectorStore) {
      throw new Error('Embeddings orr vector store not initialized');
    }

    // Initialize Octokit with the GitHub access token
    const octokit = new Octokit({
      auth: process.env.GITHUB_ACCESS_TOKEN
    });

    const loader = new GithubRepoLoader(processedUrl, {
      branch: "main", // You might want to make this configurable
      recursive: true,
      unknown: "warn",
      maxConcurrency: 5,
      accessToken: process.env.GITHUB_ACCESS_TOKEN,
      // Remove the githubApi option as it's not a valid parameter for GithubRepoLoader
    });

    const docs = await loader.load();
    console.log(`Loaded ${docs.length} documents`);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`Split into ${splitDocs.length} chunks`);

    const repoName = new URL(url).pathname.split('/').pop() || 'unknown';

    const processedDocs = splitDocs.map(doc => ({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        repo: repoName,
      },
    }));

    await vectorStore.addDocuments(processedDocs);
    console.log(`Added ${processedDocs.length} documents to vector store`);

    return NextResponse.json({ 
      message: 'Repository processed successfully', 
      repoName, 
      documentsProcessed: processedDocs.length 
    });
  } catch (error: unknown) {
    console.error('Error processing repository:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to process repository', details: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Failed to process repository', details: 'An unknown error occurred' }, { status: 500 });
    }
  }
}
