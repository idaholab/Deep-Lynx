# 1. Programming Language

Date: 2024-10-29

## Status

Accepted

## Context
Need to record the programming language decisions made over the course of five years with regards to DeepLynx. 

Node.js was chosen primarily because it unified the front-end and backend languages into one that a single developer could do without having to learn multiple languages.

Rust came about mainly due to the deficiencies in Node.js - particularly the data processing and iteration problems due to Node.js single-threading. We choose Rust over C++ due to developer ecosystem and experience with the build tools.

## Decision
Use Node.js(2018)-Typescript with Rust(2021?) native modules where required in order to avoid data processing delays.

## Consequences
All code should be written in Node.js-Typescript when possible and when it would not cause a performance issue for the users or data processing. When not possible, code should be written as native Rust modules.
