# 1. AI Use and Infrastructure Decisions

Date: 2024-11-13

## Status

Accepted

## Context
Datum needs to provide a semantic search layer to its users. We are trying to do so _without_ having to require other infrastructure apart from what we have (such as requiring elastic search). The use of AI has been proposed and discussed - with the idea that we could support natural language querying. We want to also provide a better search experience than simply doing full text search alone - eventually.

## Decision(s)
- We will use local models for creating embeddings for vector search and for converting queries into vectors
- We will _integrate_ with AI services, with Ollama being the first, in order to build and offer natural language querying to our users.

## Consequences
The only local models implemented should be those needed to create embeddings. Any additional AI enabled capabilities should be via integrations, first with Ollama and OpenAI.
