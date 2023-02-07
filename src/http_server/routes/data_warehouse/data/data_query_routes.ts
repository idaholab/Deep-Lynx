import {Application, NextFunction, Request, Response} from 'express';
import {parseISO} from 'date-fns';
import {authInContainer} from '../../../middleware';
import GraphQLRunner from '../../../../graphql/schema';

export default class DataQueryRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/data', ...middleware, authInContainer('read', 'data'), this.query);
    }

    // very simple route that passes the raw body directly to the graphql query
    // for the complex portions of this endpoint visit the data_query folder and functions
    private static query(req: Request, res: Response, next: NextFunction) {
        const runner = new GraphQLRunner();

        // ensure pointInTime format if provided
        if (req.query.pointInTime) {
            // define acceptable date format as ISO
            const date_conversion_format = 'yyyy-MM-ddTHH:mm:ss.SSSZ';
            const convertedDate = parseISO(req.query.pointInTime.toString());

            // if conversion is unsuccessful, return from the call with an explanation
            if (isNaN(convertedDate.getTime())) {
                return res.status(400).json('The pointInTime query parameter was not provided a valid date input. ' +
                    'Please provide an input in the format ' + date_conversion_format);
            }
        }

        const metadataEnabled = (req.query.metadataEnabled === 'true')

        runner
            .RunQuery(
                req.container?.id!,
                {query: req.body.query, variables: req.body.variables},
                {
                    ontologyVersionID: req.query.ontologyVersionID as string,
                    returnFile: String(req.query.returnFile).toLowerCase() === 'true',
                    returnFileType: String(req.query.returnFileType).toLowerCase(),
                    pointInTime: req.query.pointInTime as string,
                    metadataEnabled: metadataEnabled,
                    query: req.body.query,
                },
            )
            .then((response) => {
                res.status(200).json(response);
            })
            .catch((e) => {
                res.status(500).json(e.toString());
            });
    }
}
