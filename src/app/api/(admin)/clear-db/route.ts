import { NextResponse } from 'next/server';
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY, // Add this line
});

export async function DELETE(request: Request) {
  try {
    // Get all collections
    const collections = await qdrantClient.getCollections();

    // Delete each collection
    for (const collection of collections.collections) {
      await qdrantClient.deleteCollection(collection.name);
    }

    return NextResponse.json({ message: 'All collections deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting collections:', error);
    return NextResponse.json({ error: 'Failed to delete collections' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Get all collections
    const collections = await qdrantClient.getCollections();

    return NextResponse.json({ collections: collections.collections }, { status: 200 });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

// Handle unsupported methods
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, DELETE, OPTIONS'
    }
  });
}
