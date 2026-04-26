# Schema Compatibility Strategy

## Field Name Mapping: SQLite (snake_case) → MongoDB (camelCase)

The legacy SQLite schema uses snake_case column names. MongoDB documents use camelCase.
The migration script (`scripts/migrate-sqlite-to-mongo.js`) maps every field explicitly.

| SQLite column       | MongoDB field     | Collection   |
|---------------------|-------------------|--------------|
| verse_number        | verseNumber       | verses       |
| book_abbrev         | bookAbbrev        | discussions  |
| on_title            | onTitle           | comments     |
| book_reference      | bookReference     | comments     |
| verse_reference     | verseReference    | discussions  |
| verse_text          | verseText         | discussions  |
| comment_text        | commentText       | discussions  |
| comment_id (int FK) | commentId (ObjId) | discussions  |
| verse_id   (int FK) | verseId   (ObjId) | comments     |

## Integer PK → ObjectId mapping

SQLite uses auto-increment integers for PKs. The migration script builds an in-memory
map (int id → MongoDB ObjectId) for `verses` and `comments` before inserting records
that reference them, ensuring FK integrity is preserved after migration.

## Why camelCase in Mongo?

Mongoose's convention and JavaScript best practices favour camelCase. The domain
entities and repository interfaces all use camelCase, providing a uniform contract
regardless of how historical data was stored. The migration script is the only place
where snake_case appears.
