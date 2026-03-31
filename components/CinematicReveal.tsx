[
  {
    "policyname": "Allow public read for shared links",
    "cmd": "SELECT",
    "qual": "true"
  },
  {
    "policyname": "storyscribe_view_all",
    "cmd": "SELECT",
    "qual": "true"
  },
  {
    "policyname": "storyscribe_create",
    "cmd": "INSERT",
    "qual": null
  },
  {
    "policyname": "storyscribe_update",
    "cmd": "UPDATE",
    "qual": "true"
  },
  {
    "policyname": "storyscribe_delete",
    "cmd": "DELETE",
    "qual": "(created_by = auth.uid())"
  },
  {
    "policyname": "stories_public_read",
    "cmd": "SELECT",
    "qual": "true"
  },
  {
    "policyname": "Users can view own stories",
    "cmd": "SELECT",
    "qual": "((user_id = auth.uid()) OR (user_id IS NULL))"
  },
  {
    "policyname": "Users can insert own stories",
    "cmd": "INSERT",
    "qual": null
  },
  {
    "policyname": "Users can update own stories",
    "cmd": "UPDATE",
    "qual": "(user_id = auth.uid())"
  }
]