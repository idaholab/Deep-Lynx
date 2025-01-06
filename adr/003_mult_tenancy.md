# 3. Multi-tenancy management

Date: 2024-12-11

## Status

Accepted

## Original Requirement
> The application shall enable a multi-tenant architecture where multiple teams can use the same deployment. 

## Context
The original DeepLynx had a surface level multi-tenancy system in that everything was done in the context of a `container` (though at the database level everything was in the same tables and schema). While we want to be able to do groupings of data and users based on projects, we don't think that its wise to attempt the same methodology of having the same context bounds for every operation. Also, because the data origins are separate databases already, separation of data is no longer a major concern. We also plan on adopting the least-privilege principal, meaning that new users don't have access to any data unless granted that access by the owners or parties with permission to do so. This will allow us data separation without having to a multi-tenant system.

In the case of our hosted DeepLynx environment - if a user or project requires more data and application isolation than previously described, we propose that the best method is simply standing up an additional server and making a subdomain record and pointing that to the new server. e.g `project.deeplynx.inl.gov`. This will allow complete separation of data, and because we don't have a centralized database to begin with, doing separate servers from an infrastructure standpoint doesn't become difficult.

## Decision(s)
- Multi-tenancy will not be part of the core DeepLynx application - instead we will follow a least privilege protocol when granting access to data for new users.
- Data isolation is achieved in one of two ways:
    - Through the use of separate data origins and controlled by group permissions (and potentially a project grouping later on)
    - By standing up an additional server and serving it at a subdomain for our hosted DeepLynx.

## Consequences
The terminology of `containers` will be retired and replaced by permissions, groups, and potentially a project grouping TBD.
