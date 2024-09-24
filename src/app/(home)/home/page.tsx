'use client';

import { useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Loader2, Send, GitBranch, Image, PenTool, FileText, BarChart, Github, Twitter, Star } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './markdown-styles.css';

export default function Component() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [result, setResult] = useState<{ message: string; repoName: string; documentsProcessed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionsAsked, setQuestionsAsked] = useState(47118);
  const [reposProcessed, setReposProcessed] = useState(1532);

  const { messages, input, handleInputChange, handleSubmit: handleChatSubmit, isLoading: isAiResponding } = useChat({
    api: '/api/chat',
  });

  const sampleQuestions = [
    { icon: <Image className="w-4 h-4" />, text: "Explain the project structure" },
    { icon: <PenTool className="w-4 h-4" />, text: "List main features" },
    { icon: <FileText className="w-4 h-4" />, text: "Summarize dependencies" },
    { icon: <BarChart className="w-4 h-4" />, text: "Analyze code complexity" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setIsProcessed(false);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to process repository');
      }

      const data = await response.json();
      setResult(data);
      setIsProcessed(true);
      setReposProcessed(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const canvas = document.getElementById('starCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const stars: { x: number; y: number; size: number; opacity: number }[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5,
        opacity: Math.random() * 0.7,
      });
    }

    function animate() {
     
      requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white relative overflow-hidden">
      <canvas id="starCanvas" className="absolute inset-0" />
      <div className="container mx-auto px-[15%] py-4 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-gray-800 bg-opacity-50 p-4 rounded-lg">
          <div className="flex items-center mb-4 md:mb-0">
            <Github className="w-8 h-8 mr-2 opacity-70" />
            <h2 className="text-xl font-bold text-gray-200">Cosmic Repository Explorer</h2>
          </div>
          <div className="flex items-center space-x-4">
            <a href="https://github.com/yourusername/cosmic-repo-explorer" target="_blank" rel="noopener noreferrer" className="flex items-center text-gray-300 hover:text-blue-400 transition-colors">
              <Github className="w-5 h-5 mr-1 opacity-70" />
              <span>GitHub Repo</span>
            </a>
            <a href="https://twitter.com/yourusername" target="_blank" rel="noopener noreferrer" className="flex items-center text-gray-300 hover:text-blue-400 transition-colors">
              <Twitter className="w-5 h-5 mr-1 opacity-70" />
              <span>@yourusername</span>
            </a>
            <Button variant="outline" size="sm" className="flex items-center bg-opacity-20 hover:bg-opacity-30 transition-all">
              <Star className="w-4 h-4 mr-1 opacity-70" />
              <span>Star</span>
            </Button>
          </div>
        </header>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            Cosmic Repository Explorer
          </h1>
          <p className="text-gray-400">Explore GitHub repositories with AI-powered insights</p>
        </div>

        <div className="flex justify-between items-center mb-8 text-sm text-gray-400">
          <span>{questionsAsked.toLocaleString()} questions asked so far</span>
          <span>{reposProcessed.toLocaleString()} GitHub repos processed</span>
        </div>

        <Card className="bg-gray-800 bg-opacity-50 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-gray-200">Process GitHub Repository</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter GitHub repository URL"
                className="bg-gray-700 bg-opacity-50 text-white border-gray-600 placeholder-gray-400"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 bg-opacity-80 hover:bg-opacity-100 text-white transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    <GitBranch className="mr-2 h-4 w-4" />
                    Process Repository
                  </>
                )}
              </Button>
            </form>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-4 p-4 bg-red-900 bg-opacity-30 rounded"
                >
                  <p className="text-red-200">{error}</p>
                </motion.div>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-4 bg-gray-700 bg-opacity-30 p-4 rounded"
                >
                  <h3 className="text-xl font-semibold mb-2 text-gray-200">Result:</h3>
                  <p className="text-gray-300">{result.message}</p>
                  <p className="text-gray-300">Repository: {result.repoName}</p>
                  <p className="text-gray-300">Documents Processed: {result.documentsProcessed}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 bg-opacity-50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-200">Chat with Repository</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full pr-4 mb-4">
              {messages.map((m, index) => (
                <div key={m.id} className="mb-4">
                  <div className={`flex items-center space-x-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className={`px-2 py-1 rounded ${m.role === 'user' ? 'bg-blue-600 bg-opacity-70' : 'bg-purple-600 bg-opacity-70'}`}>
                      {m.role === 'user' ? 'You' : 'AI'}
                    </span>
                    <div className="text-sm text-gray-300 markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                  {index < messages.length - 1 && <Separator className="my-2 bg-gray-600 opacity-30" />}
                </div>
              ))}
            </ScrollArea>
            <form onSubmit={handleChatSubmit} className="mt-4 space-y-2">
              <Input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Message Cosmic Explorer..."
                className="w-full bg-gray-700 bg-opacity-50 text-white border-gray-600 placeholder-gray-400"
                required
                disabled={!isProcessed || isAiResponding}
              />
              <Button 
                type="submit" 
                className="w-full bg-green-600 bg-opacity-80 hover:bg-opacity-100 text-white transition-all"
                disabled={!isProcessed || isAiResponding}
              >
                {isAiResponding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI is thinking...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </form>
            {!isProcessed && (
              <p className="text-yellow-400 mt-4 opacity-80">Please process a repository before chatting.</p>
            )}
            {isProcessed && (
              <div className="mt-6">
                <h2 className="text-2xl font-bold mb-4 text-center text-gray-200">Where should we start?</h2>
                <div className="grid grid-cols-2 gap-4">
                  {sampleQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="flex items-center justify-start space-x-2 bg-gray-700 bg-opacity-50 hover:bg-opacity-70 border-gray-600 text-left text-gray-300 transition-all"
                      onClick={() => handleInputChange({ target: { value: question.text } } as React.ChangeEvent<HTMLInputElement>)}
                      disabled={isAiResponding}
                    >
                      {question.icon}
                      <span>{question.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8 bg-gray-800 bg-opacity-50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-200">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>Enter a GitHub repository URL in the "Process Repository" section.</li>
              <li>Our system analyzes the repository's structure and content.</li>
              <li>Once processed, you can start chatting about the repository in the "Chat with Repository" section.</li>
              <li>Use the sample questions or ask your own to explore the repository's details.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}