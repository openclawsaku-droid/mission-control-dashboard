# Mission Control Data Schema

## activities.json
アクティビティログ（全操作記録）
```json
[
  {
    "id": "uuid",
    "timestamp": "ISO8601",
    "type": "file|exec|message|search|task",
    "action": "create|edit|delete|send|complete",
    "details": "説明",
    "metadata": {}
  }
]
```

## tasks.json
タスク管理（カレンダー用）
```json
[
  {
    "id": "uuid",
    "title": "タスク名",
    "description": "詳細",
    "dueDate": "ISO8601",
    "status": "pending|completed|cancelled",
    "createdAt": "ISO8601"
  }
]
```

## search-index.json
検索インデックス（グローバル検索用）
```json
[
  {
    "path": "ファイルパス",
    "type": "memory|document|task",
    "content": "検索対象テキスト",
    "lastIndexed": "ISO8601"
  }
]
```
