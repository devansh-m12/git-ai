import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

async function emptyDirectory(directory: string) {
  const files = await fs.readdir(directory);
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      await emptyDirectory(filePath);
      await fs.rmdir(filePath);
    } else {
      await fs.unlink(filePath);
    }
  }
}

async function checkRepoExists(url: string): Promise<boolean> {
  try {
    await execAsync(`git ls-remote ${url}`);
    return true;
  } catch (error) {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Check if the repository exists
    const repoExists = await checkRepoExists(url);
    if (!repoExists) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    const downloadDir = path.join(process.cwd(), 'public/repo');
    
    // Empty the public/repo folder
    await emptyDirectory(downloadDir);

    // Ensure the directory exists (in case it was deleted)
    await fs.mkdir(downloadDir, { recursive: true });

    const repoName = url.split('/').pop()?.replace('.git', '') || 'repo';
    const targetDir = path.join(downloadDir, repoName);

    // Clone the repository
    await execAsync(`git clone ${url} ${targetDir}`);

    return NextResponse.json({ message: 'Repository downloaded successfully', repoName });
  } catch (error) {
    console.error('Error downloading repository:', error);
    return NextResponse.json({ error: 'Failed to download repository' }, { status: 500 });
  }
}
