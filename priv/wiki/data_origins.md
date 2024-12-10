# Data Origins

Data Origins play a key role in DeepLynx 2.0. It is the new manner in which data is organized, separated, managed, and searched. This article seeks to explain exactly what a Data Origin is currently, what it hopes to be, and how it works technically.

## What is a Data Origin in DeepLynx 2.0?

As stated earlier a data origin is the new manner in which data is organized, separated, managed, and searched. They typically represent a system or application in which data resides and which DeepLynx 2.0 either has current, direct access to, or has scanned previously. Data Origins may also be created by hand, in which case the system they represent would be the internal storage mechanisms of the currently deployed DeepLynx instance. 

Origins serve as a logical separation of data - almost like containers were before, except that an Origin typically consists of only one source of the data it's read/scanned/has access to. Examples of a Data Origin could be an S3 Bucket, a network storage device, a scanned folder system on someone's hard drive, a Box folder or account, a SQL-like data store etc. 

## Data Origin Organization

A Data Origin is typically organized and represented like a hierarchichal file system. The Origin itself could be considered a top-level folder, and it can contain an infinite amount and depth of folders which contains different kinds of data. Much like a UNIX filesystem, we treat everything as either a folder or a "file" (though there are many different kinds of file the system will recognize). 

Folders and files should be allowed to be moved and copied *within* their origin - and the ability to quickly reorganize and restructure the data should be a paramount feature and capability of the system. 

Also like a UNIX filesystem, Data Origins should also be allowed to contain what we're terming "symlinks" or "symbolic links" to data in other origins. These should be represented in a clear manner in the system, and will allow users to swiftly include data from multiple different origins in one place without having to copy the data or fill our storage systems completely. These symlinks should follow all the same rules as the filesystem before it.

**NOTE**: The filesystem relationship and organizational structure *IS NOT THE GRAPH*. While the default method of storing and referring to data is in a filesystem, we are also able to create relationships between data through a much looser relationship system, which will be talked about in a different document. While symlinks create a representation in the host Data Origin of data that might belong to a different origin, this looser relationship system will not and will typically contain information as to where the data it's connected to natively lives.


## Do Data Origins Contain Metadata or Data?
This is an excellent question and the answer is - it depends. We imagine that it will be about 50/50 in the terms of origins which have access to the data they represent and origins in which we only possess the metadata about the data they represent. 

For example, the default Data Origin that someone creates manually in DeepLynx will contain both Metadata and Data, as it will use the default storage system managed by the application itself - allowing users to store actual data.

Another example might be an S3 bucket. If someone creates a Data Origin from an S3 bucket - they can choose to store access credentials in DeepLynx itself. If DeepLynx has access credentials, we would say that the Data Origin can contain both Data and Metadata and we treat it accordingly.

If that same Data Origin was created from an S3 bucket - but access was _not_ given to DeepLynx, then it is said to contain only the Metadata as it does not have direct access to the data it reprsents. Users scanning their local filesystems and uploading the results, or NASs that DeepLynx doesn't have direct access to would also contain only metadata. The difference should be made clear to the user.

In the case that a Data Origin has access to the underlying data it represents - it is assumed that any actions taken on DeepLynx *DOES NOT AFFECT* the underlying storage unless explicity set thus by the user. We should default to non-interaction in all cases.


## Searching Data Origins

The search engine works across all Data Origins a user has access to by default (currently). There are some controls as to how many results from each origin should be shown, and results are shown in order of relevancy. Eventually we plan on having tighter controls allowing you to narrow your search to specific origins. Searches are run concurrently on Data Origins, hopefully meaning that searches across the breadth of information a DeepLynx instance might hold are rapid and results quick to be had.

## Data Origin Permissions

Data Origins belong to one person only - the person who created it, or the user they transfer ownership too. No matter what data is in the Origin, the owner will always have full rights to that data. 

Permissions are managed at the data level - but you can grant permissions recursively. Meaning that if you give someone read access to your Data Origin, you should have the option of granting recursive access to all data within the origin. At that point, the permissions will be created on each piece of data in the origin for that user. 

We debated working with a permissions inheritance system - but eventually settled on how UNIX filesystems model and store permissions. Though we might have more records in the database relating to data permissions, we can be more fine-grained in our approach to granting access and do not have to worry about complicated inheritance schemes.


# Data Origin Technology

So what exactly is a Data Origin? If you navigate through the main SQLite database you might be left scratching your head - because while there is an `data_origins` table, there are no tables referring to their data or representing things like configurations etc. 

Due to our technology choice of SQLite (and in the future other in-process databases like DuckDB) - we have been able to provide isolation between Data Origins in a very simple way. Each Data Origin is a *separate* SQLite or other type of database. 

Let me repeat that: **Each Data Origin is a _separate_ database**.

We've done this for a few reasons:

* Allows for easy isolation of data between projects, users, and groups
* Allows for fast, concurrent searching and interactions with all data origins when needed
* Allows us to restrict access and incorporate things like encryption on data origins that might require special handling or storage
* Allows us to split large data groups across multiple origins, and ensures that a large data origin don't affect users who have smaller data origins 
* Data Origins become portable, and allows us to use the CLI to make a data origin locally, and then upload the entire thing to the cloud

### Connecting Data Across Origins

One of the biggest questions is - how do we connect data across Data Origins if they are separate databases? We cannot simply create a join table and include foreign keys - as they are separate databases, foreign keys would simply not function nor be effective. We have solved the connection between origins a few ways:

- *Symbolic Links* - as mentioned previously we are creating the ability to create a symbolic link in an origin of data that might exist in a different origin. We must be careful with how we synchronize the two records, but this should go a long way in making sure we can view data from two different origins in one.
- *Connection Tuples* - when we make symbolic links, or use the looser graph relationship system, we always refer to a data's ID as a tuple (two value list). That is `{data_id, data_origin_id}` - this allows us to always have a reference back to the Data Origin that hosts the data. While it does require more technical work and queries to pull data, and then make requests of different origins, because the origins are separate databases we are able to do these additional queries concurrently - adding very little overhead to data calls where data might not be in the same origin.
- *[SQLite `[ATTACH DATABASE]`](https://www.sqlite.org/lang_attach.html) - Though we don't currently have any code using this functionality, SQLite allows you to attach any number of separate databases to each other at query time. This allows us to build a database that is a conglomeration of as many separate databases as you like, and then run queries across all of them. We currently view this as as last resort - as it's typically faster to run multiple, concurrent queries across origins than join them and run the query on a single process.

### How Separation Is Handled in Elixr/Ecto

We use [Ecto](https://hexdocs.pm/ecto) as our database interaction platform, with the [Ecto.Sqlite3](https://hexdocs.pm/ecto_sqlite3/0.17.5/api-reference.html) adapter. Typically an Elixir and Phoenix application has only one `Repo` typically called `ApplicationName.Repo` and initialized at the start of the application. DeepLynx _does_ have this - but that the `Datum.Repo` module ONLY interacts with what we call the "Operations" database - the database that contains things like user information, and maps for origins etc. You'll notice we use it exclusively when dealing with Users, Data Origins as a record, and things like permissions.

When dealing with a Data Origin however, you cannot use the `Datum.Repo` module - as that does not know how to communicate with whatever Data Origin database you're attempting to contact. Instead, you must use the `Datum.DataOrigin.OriginRepo` located in `lib/datum/data_origin/repo.ex`. This module has functions which allow you to wrap a normal `Ecto.Query` in functions which will route it to the correct database file. This function [here](https://github.inl.gov/Digital-Engineering/Datum/blob/main/lib/datum/data_origin/repo.ex#L15) is the wrapper and [here](https://github.inl.gov/Digital-Engineering/Datum/blob/main/lib/datum/data_origin.ex#L181) is an example of it in action. Note that you must have the full `DataOrigin` record available in order to tell the system how to route your calls and any configuration values it needs.
