// Express
import {Application} from 'express';

// Middleware
import {authInContainer} from '../../../middleware';

// Route Function Handlers
import TagFunctions from './graph_functions/tag_functions';
import NodeFunctions from './graph_functions/node_functions';
import FileFunctions from './graph_functions/file_functions';
import EdgeFunctions from './graph_functions/edge_functions';
import TimeseriesFunctions from './graph_functions/timeseries_functions';

export default class GraphRoutes {
    public static mount(app: Application, middleware: any[]) {

        // Node Routes
        app.post('/containers/:containerID/graphs/nodes/', ...middleware, authInContainer('write', 'data'), NodeFunctions.createOrUpdateNodes);
        app.get('/containers/:containerID/graphs/nodes/metatype/:metatypeID', ...middleware, authInContainer('read', 'data'), NodeFunctions.listNodesByMetatypeID);
        app.get('/containers/:containerID/graphs/nodes/', ...middleware, authInContainer('read', 'data'), NodeFunctions.listNodes);
        app.get('/containers/:containerID/graphs/nodes/:nodeID', ...middleware, authInContainer('read', 'data'), NodeFunctions.retrieveNode);
        app.delete('/containers/:containerID/graphs/nodes/:nodeID', ...middleware, authInContainer('write', 'data'), NodeFunctions.deleteNode);
        // This should return a node and all connected nodes and connecting edges for n layers.
        app.get('/containers/:containerID/graphs/nodes/:nodeID/graph', ...middleware, authInContainer('read', 'data'), NodeFunctions.retrieveNthNodes);

        // Timeseries Routes
        app.post('/containers/:containerID/graphs/nodes/:nodeID/timeseries', ...middleware, authInContainer('read', 'data'), TimeseriesFunctions.queryTimeseriesData);
        app.get('/containers/:containerID/graphs/nodes/:nodeID/timeseries', ...middleware, authInContainer('read', 'data'), TimeseriesFunctions.queryTimeseriesDataTypes);
        app.post(
            '/containers/:containerID/import/datasources/:dataSourceID/data',
            ...middleware,
            authInContainer('read', 'data'),
            TimeseriesFunctions.queryTimeseriesDataSource,
        );

        // File Routes
        app.get('/containers/:containerID/graphs/nodes/:nodeID/files', ...middleware, authInContainer('read', 'data'), FileFunctions.listFilesForNode);
        app.get('/containers/:containerID/graphs/edges/:edgeID/files', ...middleware, authInContainer('read', 'data'), FileFunctions.listFilesForEdge);
        app.put('/containers/:containerID/graphs/nodes/:nodeID/files/:fileID', ...middleware, authInContainer('write', 'data'), FileFunctions.attachFileToNode);
        app.delete('/containers/:containerID/graphs/nodes/:nodeID/files/:fileID', ...middleware, authInContainer('write', 'data'), FileFunctions.detachFileFromNode);
        app.put('/containers/:containerID/graphs/edges/:edgeID/files/:fileID', ...middleware, authInContainer('write', 'data'), FileFunctions.attachFileToEdge);
        app.delete('/containers/:containerID/graphs/edges/:edgeID/files/:fileID', ...middleware, authInContainer('write', 'data'), FileFunctions.detachFileFromEdge);
        
        // Edge Routes
        app.post('/containers/:containerID/graphs/edges/', ...middleware, authInContainer('write', 'data'), EdgeFunctions.createOrUpdateEdges);
        app.get('/containers/:containerID/graphs/edges/:edgeID', ...middleware, authInContainer('read', 'data'), EdgeFunctions.retrieveEdge);
        app.get('/containers/:containerID/graphs/edges/', ...middleware, authInContainer('read', 'data'), EdgeFunctions.listEdges);
        // This should return all edges which contain one of the ids in the payload
        app.post('/containers/:containerID/graphs/nodes/edges', ...middleware, authInContainer('read', 'data'), EdgeFunctions.retrieveEdges);
        app.delete('/containers/:containerID/graphs/edges/:edgeID', ...middleware, authInContainer('write', 'data'), EdgeFunctions.archiveEdge);
        
        // Tag Routes
        app.post('/containers/:containerID/graphs/tags', ...middleware, authInContainer('write', 'data'), TagFunctions.createTag)
        app.put('/containers/:containerID/graphs/tags/:tagID/nodes/:nodeID', ...middleware, authInContainer('write', 'data'), TagFunctions.attachTagToNode);
        app.put('/containers/:containerID/graphs/tags/:tagID/edges/:edgeID', ...middleware, authInContainer('write', 'data'), TagFunctions.attachTagToEdge);
        app.put('/containers/:containerID/graphs/tags/:tagID/files/:fileID', ...middleware, authInContainer('write', 'data'), TagFunctions.attachTagToFile);
    }
}
