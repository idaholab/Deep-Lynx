# Why SQlite

DeepLynx 1.0 used PostgreSQL exclusively, so a lot of people have asked "Why did you switch to Sqlite3?". It's an extremely valid question, and one I hope to answer in this article as DeepLynx 2.0 uses Sqlite3 and plans on expanding to other in-process databases such as DuckDB. 

So, why the switch?

## Limitations of PostgreSQL

This is not something you think to see often. Postgres is so versatile and battle-tested. However, there are some big foot-guns that we were starting to see bite hard in our original database implementation that I'd like to cover here. 

#### Required Infrastructure
Postgres is a standalone server - meaning that in order to run DeepLynx you have to have stood up a PostgreSQL server _somewhere_. For those experimenting locally that was often through our Docker Compose setup (which was it's own issue as they often didn't mount a volume and experienced data loss). Oftentimes this single requirement pushed people away from experimenting with DeepLynx and considerably increased the barrier to entry. It was an entire other application that someone had to manage, replicate, etc. 

#### Extensions
DeepLynx 1.x required TimescaleDB for a long time, as it was our timeseries requirement. While Azure and other major cloud providers that have managed PostgreSQL instances had the plugin - the Timescale license prohibited them from offering the best part of the plugin. This caused a lot of heartache as expansion that direction would have required us to manage our own Postgres (as well as our customers). We also didn't have a easy way of including the extensions with our shipped DeepLynx - again requiring more setup.

#### Multi-tenancy
DeepLynx 1.x tried to separate everything by containers, i.e. projects. While a decent idea, that separation didn't happen at the database level - meaning everyones graph data shared the same nodes and edges table. While this can be attributed more to design than to Postgres itself, migrating away from this pattern was prohibited by the difficulty in migrating Postgres databases. 

#### Scaling
Postgres _can_ scale - but to do so often requires someone who knows Postgres intimately and has a significant amount of time to give to the system *or* someone willing to drop a lot of $$ to cloud providers. Replication setup for vanilla Postgres is also cumbersome and easily misconfigured - making plugins like Citus nearly required (adding more potential license costs and infrastructure requirments)

There are more potential issues that I don't want to waste space listing here. While all databases have issues - we found that the requirements PostgreSQL heaped on us and our potential customers were too much, and the probability of misconfiguring too high to recommend its use in a production environment where data is key. See more [here](https://rbranson.medium.com/10-things-i-hate-about-postgresql-20dbab8c2791).


## SQlite3

With the switch to 2.0 we had the unique chance to rethink our database strategy and make sweeping, breaking changes that we haven't been able to do up until now. With that being said, we've decided to utilize SQlite3 as our primary database, with DuckDB as an extension option. So let's discuss some of the main reasons why.

#### Infrastructure
SQlite3 is an in-process database. Meaning it's managed and run by your application itself, through a set of libraries. SQlite doesn't compete with other client/server databases "SQlite competes with `fopen()`. We no longer have to require our customers, or ourselves, to setup a third party database in order to utilize our product. Instead our requirements are simplified greatly - all we ask for is for a durable fileysystem, after that we get out of your way. 

Because our infrastructure requirement is so minimal (just a binary and a filesystem at time of writing) it greatly lowers the barrier to entry that most customers and developers faced getting into the system. It also opens the door for the customers and ourselves to manage our own backup strategy. For example, users can utilize tools like [LiteFS](https://fly.io/docs/litefs/) or [Litestream](https://litestream.io/). Or they can be as simple as setting up hourly backups of a durable volume provided to Kubernetes.

#### Extension Portability
We can easily ship our required extensions for SQLite with the application itself, compiling them into our application and the user doesn't even know the difference or has to care if they have a certain extension installed. The majority of extensions that exist are also open-source with and more permissive that TimescaleDB. 

#### Data Isolation
Because a SQLite database is just a file, it makes it extremely easy for us to create isolation between users, data, or any other dimension we choose to do so. This also lets us manage the size of any one database, ensuring that we're splitting the data up in such a way as to enable high performance and scalability. This also allows us to easily extend the CLI functionality by having it use the same database and database schema, and same technology, as the server. Extending to use DuckDB for some of the data? Easily done when your application already respects data boundaries as individual databases.

#### Fast Reads/Searchs
There is no round-trip cost from our application to the database. While 10-15ms doesn't feel like much, that delay can add up over time. Also, because we're separating data into their own files we have the ability to run _concurrent_ searches across larger amounts of data and compile those results to present to the user faster than we could through Postgres (according to initial testing and industry benchmarks). 


There are more reasons, but like the reasons not to use PostgreSQL I don't have the space or time to list them all here. I hope we can discover more of the reasons together - and while it won't all be roses, this direction is hopefully one we see fruit from almost immediately.


### Additional Resources

[Consider SQLite](https://blog.wesleyac.com/posts/consider-sqlite)

[Appropriate Uses for SQLite](https://www.sqlite.org/whentouse.html)