// Express
import express, {NextFunction, Request, Response} from 'express';
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
import Result from '../../../../common_classes/result';
import ContainerRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/container_repository';
import RedisGraphService from '../../../../services/cache/redis_graph_loader';
import {parseISO} from 'date-fns';

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
        app.get('/containers/:containerID/graphs/nodeCount', ...middleware, authInContainer('read', 'data'), NodeFunctions.countNodes);

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
        app.get(
            '/containers/:containerID/import/datasources/:sourceID/timeseries/count',
            ...middleware,
            authInContainer('read', 'data'),
            TimeseriesFunctions.retrieveTimeseriesRowCount,
        );
        app.get(
            '/containers/:containerID/import/datasources/:sourceID/timeseries/range',
            ...middleware,
            authInContainer('read', 'data'),
            TimeseriesFunctions.retrieveTimeseriesRange,
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
        app.put(
            '/containers/:containerID/import/datasources/:sourceID/files/:fileID',
            ...middleware,
            authInContainer('write', 'data'),
            FileFunctions.updateFile,
        );
        app.get(
            '/containers/:containerID/files/:fileID/download',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('read', 'data'),
            FileFunctions.downloadFile,
        );
        app.delete(
            '/containers/:containerID/import/datasources/:sourceID/files/:fileID',
            ...middleware,
            authInContainer('write', 'data'),
            FileFunctions.deleteFile,
        );
        app.get('/containers/:containerID/graphs/nodes/:nodeID/files', ...middleware, authInContainer('read', 'data'), FileFunctions.listFilesForNode);
        app.put('/containers/:containerID/files/:fileID/rename', ...middleware, authInContainer('write', 'data'), FileFunctions.renameFile);

        //Files for Container
        app.get('/containers/:containerID/files', ...middleware, authInContainer('read', 'data'), FileFunctions.listFilesForContainer);

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
        app.delete(
            '/containers/:containerID/files/:fileID',
            ...middleware,
            authInContainer('write', 'data'),
            FileFunctions.deleteFile,
        );

        // Edge Routes
        app.post('/containers/:containerID/graphs/edges/', ...middleware, authInContainer('write', 'data'), EdgeFunctions.createOrUpdateEdges);
        app.get('/containers/:containerID/graphs/edges/:edgeID', ...middleware, authInContainer('read', 'data'), EdgeFunctions.retrieveEdge);
        app.get('/containers/:containerID/graphs/edges/', ...middleware, authInContainer('read', 'data'), EdgeFunctions.listEdges);
        // This should return all edges which contain one of the ids in the payload
        app.post('/containers/:containerID/graphs/nodes/edges', ...middleware, authInContainer('read', 'data'), EdgeFunctions.retrieveEdges);
        app.delete('/containers/:containerID/graphs/edges/:edgeID', ...middleware, authInContainer('write', 'data'), EdgeFunctions.archiveEdge);
        app.get('/containers/:containerID/graphs/edgeCount', ...middleware, authInContainer('read', 'data'), NodeFunctions.countEdges);

        // Tag Routes
        app.get('/containers/:containerID/graphs/tags', ...middleware, authInContainer('write', 'data'), TagFunctions.listTags);
        app.post('/containers/:containerID/graphs/tags', ...middleware, authInContainer('write', 'data'), TagFunctions.createTag);
        app.put('/containers/:containerID/graphs/tags/:tagID', ...middleware, authInContainer('write', 'data'), TagFunctions.updateTag);
        app.put('/containers/:containerID/graphs/tags/:tagID/nodes/:nodeID', ...middleware, authInContainer('write', 'data'), TagFunctions.attachTagToNode);
        app.put('/containers/:containerID/graphs/tags/:tagID/nodes', ...middleware, authInContainer('write', 'data'), TagFunctions.bulkTagNodes);
        app.delete('/containers/:containerID/graphs/tags/:tagID/nodes', ...middleware, authInContainer('write', 'data'), TagFunctions.bulkDetachNodeTag);
        app.put('/containers/:containerID/graphs/tags/:tagID/edges', ...middleware, authInContainer('write', 'data'), TagFunctions.bulkTagEdges);
        app.delete('/containers/:containerID/graphs/tags/:tagID/edges', ...middleware, authInContainer('write', 'data'), TagFunctions.bulkDetachEdgeTag);
        app.put('/containers/:containerID/graphs/tags/:tagID/edges/:edgeID', ...middleware, authInContainer('write', 'data'), TagFunctions.attachTagToEdge);
        app.put('/containers/:containerID/graphs/tags/:tagID/files/:fileID', ...middleware, authInContainer('write', 'data'), TagFunctions.attachTagToFile);
        app.get('/containers/:containerID/graphs/tags/files', ...middleware, authInContainer('read', 'data'), TagFunctions.listFilesWithAnyTag);
        app.get('/containers/:containerID/graphs/tags/nodes/:nodeID', ...middleware, authInContainer('read', 'data'), TagFunctions.listTagsForNode);
        app.get('/containers/:containerID/graphs/tags/files/:fileID', ...middleware, authInContainer('read', 'data'), TagFunctions.listTagsForFile);
        app.get('/containers/:containerID/graphs/tags/edges/:edgeID', ...middleware, authInContainer('read', 'data'), TagFunctions.listTagsForEdge);
        app.get('/containers/:containerID/graphs/tags/:tagID/nodes', ...middleware, authInContainer('read', 'data'), TagFunctions.listNodesWithTag);
        app.get('/containers/:containerID/graphs/tags/:tagID/files', ...middleware, authInContainer('read', 'data'), TagFunctions.listFilesWithTag);
        app.get('/containers/:containerID/graphs/tags/:tagID/edges', ...middleware, authInContainer('read', 'data'), TagFunctions.listEdgesWithTag);
        app.delete(
            '/containers/:containerID/graphs/tags/:tagID/nodes/:nodeID',
            ...middleware,
            authInContainer('write', 'data'),
            TagFunctions.detachTagFromNode,
        );
        app.delete(
            '/containers/:containerID/graphs/tags/:tagID/edges/:edgeID',
            ...middleware,
            authInContainer('write', 'data'),
            TagFunctions.detachTagFromEdge,
        );
        app.delete(
            '/containers/:containerID/graphs/tags/:tagID/files/:fileID',
            ...middleware,
            authInContainer('write', 'data'),
            TagFunctions.detachTagFromFile,
        );

        // WebGL Routes
        app.post(
            '/containers/:containerID/graphs/webgl',
            ...middleware,
            authInContainer('write', 'data'),
            WebGLFunctions.createTag,
            WebGLFunctions.uploadFiles,
        );
        app.get('/containers/:containerID/graphs/webgl', ...middleware, authInContainer('read', 'data'), WebGLFunctions.listWebglFilesAndTags);
        app.post('/containers/:containerID/graphs/load', ...middleware, authInContainer('read', 'data'), loadRedisGraph);
        app.post('/containers/:containerID/graphs/query', ...middleware, authInContainer('read', 'data'), queryRedisGraph);
        app.put('/containers/:containerID/graphs/webgl/files/:fileID', ...middleware, authInContainer('write', 'data'), WebGLFunctions.updateWebglFiles);
        app.delete('/containers/:containerID/graphs/webgl/files/:fileID', ...middleware, authInContainer('write', 'data'), FileFunctions.deleteFile);
    }
}

function loadRedisGraph(req: Request, res: Response, next: NextFunction) {
    if (req.container) {
        const containerRepo = new ContainerRepository();
        containerRepo
            .loadIntoRedis(req.container.id!)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((e) => Result.Error(e).asResponse(res))
            .finally(() => next());
    } else {
        Result.Failure('container not found', 404).asResponse(res);
        next();
    }
}

function queryRedisGraph(req: Request, res: Response, next: NextFunction) {
    if (req.container) {
        let timestamp;
        if (typeof req.query.timestamp !== 'undefined' && (req.query.timestamp as string) !== '') {
            const date_conversion_format = 'yyyy-MM-ddTHH:mm:ss.SSSZ';
            const convertedDate = parseISO(req.query.timestamp.toString());

            // if conversion is unsuccessful, return from the call with an explanation
            if (isNaN(convertedDate.getTime())) {
                return res
                    .status(400)
                    .json(
                        'The timestamp query parameter was not provided a valid date input. ' +
                            'Please provide an input in the format ' +
                            date_conversion_format,
                    );
            }

            timestamp = req.query.timestamp.toString();

            // dates are rounded to the minute to avoid proliferation of graphs
            const coef = 1000 * 60;
            timestamp = new Date(Math.floor(new Date(timestamp).getTime() / coef) * coef).toISOString();
        }

        const redisGraph = new RedisGraphService();
        redisGraph
            .queryGraph(req.container?.id!, {query: req.body.query, variables: req.body.variables}, timestamp)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((e) => Result.Error(e).asResponse(res))
            .finally(() => next());
    } else {
        Result.Failure('container not found', 404).asResponse(res);
        next();
    }
}
