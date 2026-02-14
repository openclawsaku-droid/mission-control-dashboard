import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Activity {
  id: string;
  timestamp: string;
  type: string;
  action: string;
  details: string;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
  description?: string;
}

interface SearchResult {
  type: 'activity' | 'task';
  item: Activity | Task;
  score: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  const dataDir = path.join(process.cwd(), 'data');
  
  // Read activities
  const activitiesPath = path.join(dataDir, 'activities.json');
  const activities: Activity[] = fs.existsSync(activitiesPath)
    ? JSON.parse(fs.readFileSync(activitiesPath, 'utf-8'))
    : [];

  // Read tasks
  const tasksPath = path.join(dataDir, 'tasks.json');
  const tasks: Task[] = fs.existsSync(tasksPath)
    ? JSON.parse(fs.readFileSync(tasksPath, 'utf-8'))
    : [];

  // Search activities
  const activityResults: SearchResult[] = activities
    .filter(a => 
      a.details.toLowerCase().includes(query) ||
      a.action.toLowerCase().includes(query) ||
      a.type.toLowerCase().includes(query)
    )
    .map(a => ({
      type: 'activity' as const,
      item: a,
      score: calculateScore(a.details + ' ' + a.action + ' ' + a.type, query)
    }));

  // Search tasks
  const taskResults: SearchResult[] = tasks
    .filter(t =>
      t.title.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query))
    )
    .map(t => ({
      type: 'task' as const,
      item: t,
      score: calculateScore(t.title + ' ' + (t.description || ''), query)
    }));

  // Combine and sort by score
  const results = [...activityResults, ...taskResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // Top 20 results

  return NextResponse.json({
    query,
    total: results.length,
    results
  });
}

function calculateScore(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Exact match = highest score
  if (lowerText === lowerQuery) return 100;
  
  // Starts with query = high score
  if (lowerText.startsWith(lowerQuery)) return 90;
  
  // Contains as whole word = medium score
  const words = lowerText.split(/\s+/);
  if (words.includes(lowerQuery)) return 70;
  
  // Contains as substring = lower score
  if (lowerText.includes(lowerQuery)) return 50;
  
  return 0;
}
