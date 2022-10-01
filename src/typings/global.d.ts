import {GraphQLSchema} from 'graphql';

declare global {
    let GRAPHQLSCHEMA: Map<string, GraphQLSchema>;
}
export {};
