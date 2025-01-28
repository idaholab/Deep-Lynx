# 5. Removal of Burrito and Compliation Target Information

Date: 2025-01-27

## Status

Accepted

# Requirement
- The application shall be able to compiled on Linux, macOS, and Windows - but _cross-compliation_ shall no longer be supported.

## Context
We were using Burrito at one point to do cross compilation so that we could build windows and linux targets on our own machines comfortably. While nice to have - the actual pain of getting this working was intense and there are various unsolved issues with this.

1. Rustler precompiled binaries aren't fetched properly without various flags and can be easy to miss them
2. Rebar3 compilation not supported by Burrito -so you have to compile each dependency by hand
3. Only Elixir-make was supported - meaning any additional compliation had to happen by hand, and errors were silent

## Decision(s)
- Burrito ripped out completely
- Using `mix release` and Mix Releases to handle all release targets now. While this produces more than just a single binary, it still produces a build for the target that doesn't require any other things be installed.

## Consequences
No more single binary file :( - instead it will be a folder with a `lib` and `bin` with the binaries for each command. It's unfortunate, but we still meet the need of not having to install anything on the host machine.
