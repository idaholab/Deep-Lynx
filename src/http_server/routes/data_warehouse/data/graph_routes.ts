// Express
import express from 'express';
import {Application} from 'express';

// Middleware
import {authInContainer} from '../../../middleware';

// Route Function Handlers
import TagFunctions from './graph_functions/tag_functions';
import NodeFunctions from './graph_functions/node_functions';
import FileFunctions from './graph_functions/file_functions';
import EdgeFunctions from './graph_functions/edge_functions';
import TimeseriesFunctions from './graph_functions/timeseries_functions';
import WebGLFunctions from './graph_functions/webgl_functions';

// Utilities
import Config from '../../../../services/config';

export default class GraphRoutes {
    public static mount(app: Application, middleware: any[]) {
        // Node Routes
        app.post('/containers/:containerID/graphs/nodes/', ...middleware, authInContainer('write', 'data'), NodeFunctions.createOrUpdateNodes);
        app.get(
            '/containers/:containerID/graphs/nodes/metatype/:metatypeID',
            ...middleware,
            authInContainer('read', 'data'),
            NodeFunctions.listNodesByMetatypeID,
        );
        app.get('/containers/:containerID/graphs/nodes/', ...middleware, authInContainer('read', 'data'), NodeFunctions.listNodes);
        app.get('/containers/:containerID/graphs/nodes/:nodeID', ...middleware, authInContainer('read', 'data'), NodeFunctions.retrieveNode);
        app.delete('/containers/:containerID/graphs/nodes/:nodeID', ...middleware, authInContainer('write', 'data'), NodeFunctions.deleteNode);
        // This should return a node and all connected nodes and connecting edges for n layers.
        app.get('/containers/:containerID/graphs/nodes/:nodeID/graph', ...middleware, authInContainer('read', 'data'), NodeFunctions.retrieveNthNodes);

        // Timeseries Routes
        app.post(
            '/containers/:containerID/graphs/nodes/:nodeID/timeseries',
            ...middleware,
            authInContainer('read', 'data'),
            TimeseriesFunctions.queryTimeseriesData,
        );
        app.get(
            '/containers/:containerID/graphs/nodes/:nodeID/timeseries',
            ...middleware,
            authInContainer('read', 'data'),
            TimeseriesFunctions.queryTimeseriesDataTypes,
        );
        app.post(
            '/containers/:containerID/import/datasources/:dataSourceID/data',
            ...middleware,
            authInContainer('read', 'data'),
            TimeseriesFunctions.queryTimeseriesDataSource,
        );

        // File Routes
        app.post('/containers/:containerID/import/datasources/:sourceID/files', ...middleware, authInContainer('write', 'data'), FileFunctions.uploadFile);
        app.get(
            '/containers/:containerID/files/:fileID',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('read', 'data'),
            FileFunctions.getFile,
        );
        app.put('/containers/:containerID/import/datasources/:sourceID/files/:fileID', ...middleware, authInContainer('write', 'data'), FileFunctions.updateFile);
        app.get(
            '/containers/:containerID/files/:fileID/download',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('read', 'data'),
            FileFunctions.downloadFile,
        );
        app.get('/containers/:containerID/graphs/nodes/:nodeID/files', ...middleware, authInContainer('read', 'data'), FileFunctions.listFilesForNode);
        app.put('/containers/:containerID/graphs/nodes/:nodeID/files/:fileID', ...middleware, authInContainer('write', 'data'), FileFunctions.attachFileToNode);
        app.delete(
            '/containers/:containerID/graphs/nodes/:nodeID/files/:fileID',
            ...middleware,
            authInContainer('write', 'data'),
            FileFunctions.detachFileFromNode,
        );
        app.get('/containers/:containerID/graphs/edges/:edgeID/files', ...middleware, authInContainer('read', 'data'), FileFunctions.listFilesForEdge);
        app.put('/containers/:containerID/graphs/edges/:edgeID/files/:fileID', ...middleware, authInContainer('write', 'data'), FileFunctions.attachFileToEdge);
        app.delete(
            '/containers/:containerID/graphs/edges/:edgeID/files/:fileID',
            ...middleware,
            authInContainer('write', 'data'),
            FileFunctions.detachFileFromEdge,
        );

        // Edge Routes
        app.post('/containers/:containerID/graphs/edges/', ...middleware, authInContainer('write', 'data'), EdgeFunctions.createOrUpdateEdges);
        app.get('/containers/:containerID/graphs/edges/:edgeID', ...middleware, authInContainer('read', 'data'), EdgeFunctions.retrieveEdge);
        app.get('/containers/:containerID/graphs/edges/', ...middleware, authInContainer('read', 'data'), EdgeFunctions.listEdges);
        // This should return all edges which contain one of the ids in the payload
        app.post('/containers/:containerID/graphs/nodes/edges', ...middleware, authInContainer('read', 'data'), EdgeFunctions.retrieveEdges);
        app.delete('/containers/:containerID/graphs/edges/:edgeID', ...middleware, authInContainer('write', 'data'), EdgeFunctions.archiveEdge);

        // Tag Routes
        app.post('/containers/:containerID/graphs/tags', ...middleware, authInContainer('write', 'data'), TagFunctions.createTag);
        app.put('/containers/:containerID/graphs/tags/:tagID', ...middleware, authInContainer('write', 'data'), TagFunctions.updateTag);
        app.put('/containers/:containerID/graphs/tags/:tagID/nodes/:nodeID', ...middleware, authInContainer('write', 'data'), TagFunctions.attachTagToNode);
        app.put('/containers/:containerID/graphs/tags/:tagID/edges/:edgeID', ...middleware, authInContainer('write', 'data'), TagFunctions.attachTagToEdge);
        app.put('/containers/:containerID/graphs/tags/:tagID/files/:fileID', ...middleware, authInContainer('write', 'data'), TagFunctions.attachTagToFile);
        app.get('/containers/:containerID/graphs/tags/nodes/:nodeID', ...middleware, authInContainer('read', 'data'), TagFunctions.listTagsForNode);
        app.get('/containers/:containerID/graphs/tags/files/:fileID', ...middleware, authInContainer('read', 'data'), TagFunctions.listTagsForFile);
        app.get('/containers/:containerID/graphs/tags/edges/:edgeID', ...middleware, authInContainer('read', 'data'), TagFunctions.listTagsForEdge);
        app.get('/containers/:containerID/graphs/tags/:tagID/nodes', ...middleware, authInContainer('read', 'data'), TagFunctions.listNodesWithTag);
        app.get('/containers/:containerID/graphs/tags/:tagID/files', ...middleware, authInContainer('read', 'data'), TagFunctions.listFilesWithTag);
        app.get('/containers/:containerID/graphs/tags/:tagID/edges', ...middleware, authInContainer('read', 'data'), TagFunctions.listEdgesWithTag);

        // WebGL Routes
        app.post('/containers/:containerID/graphs/webgl', ...middleware, authInContainer('write', 'data'), WebGLFunctions.createTag, WebGLFunctions.uploadFiles);
    }
}
