# 2. Seach Method for Data Origin Databases 

Date: 2024-11-14

## Status

Accepted

## Context
Datum consists of one operations database and many many data origin databases. Since the data origin databases are where the data actually lives, we need to be able to run a user search across all data origins and return the data from that search. We had a few ways of approaching this - from attaching and combining tables in a single sqlite3 db, to doing this concurrent search. We chose the concurrent search because there might be hundreds or more data origins and that could easily break an SQL query, not to mention potentially swamp a single database.

## Decision(s)
- Search across data origins will take place concurrently, with each data origin database being opened by the main server process.

## Consequences
The Search functionality will be encapsulated in a module and made into a GenServer. Each search across the domains will be created as a SupervisedTask and the results aggregated and presented to the user.
