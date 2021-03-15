import PostgresAdapter from "./data_access_layer/mappers/db_adapters/postgres/postgres";

export class Storage {
   // Once the adapter has been initialized you can then safely initialize any other
   // storage layer at the adapter relies on.
   public async boot() {
      // PostgreSQL runs the majority of the application, while we technically
      // could get away with having an init function, I like the design pattern
      const postgresAdapter = PostgresAdapter.Instance;
      await postgresAdapter.init();
   }
}
