import {Application, NextFunction, Request, Response} from 'express';
import Result from '../../common_classes/result';
import {authInContainer} from '../middleware';
import Config from '../../services/config';


export default class ServalRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/serval/sessions', ...middleware, authInContainer('write', 'data'), this.createSession);

        app.get('/containers/:containerID/serval/sessions', ...middleware, authInContainer('read', 'data'), this.listSessions);

        app.get('/containers/:containerID/serval/sessions/:sessionID', ...middleware, authInContainer('read', 'data'), this.getSession);

        app.delete('/containers/:containerID/serval/sessions/:sessionID', ...middleware, authInContainer('write', 'data'), this.deleteSession);

        app.get('/containers/:containerID/serval/sessions/:sessionID/objects', ...middleware, authInContainer('read', 'data'), this.listObjects);

        app.get('/containers/:containerID/serval/sessions/:sessionID/objects/:objectID', ...middleware, authInContainer('read', 'data'), this.getObject);

        app.delete('/containers/:containerID/serval/sessions/:sessionID/objects/:objectID', ...middleware, authInContainer('write', 'data'), this.deleteObject);

        app.get('/containers/:containerID/serval/sessions/:sessionID/players', ...middleware, authInContainer('read', 'data'), this.listPlayers);

        app.get('/containers/:containerID/serval/sessions/:sessionID/players/:playerID', ...middleware, authInContainer('read', 'data'), this.getPlayer);

        app.delete('/containers/:containerID/serval/sessions/:sessionID/players/:playerID', ...middleware, authInContainer('write', 'data'), this.deletePlayer);
    }

    private static async createSession(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            
            const url = Config.serval_url + `/containers/${req.container.id}/sessions`;

            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(req.body),
                });
                const reader = response?.body?.pipeThrough(new TextDecoderStream()).getReader();

                while (reader) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    Result.Success(value).asResponse(res);
                } 
            } catch (error) {
                Result.Failure(`failed to create session: ${error}`, 500).asResponse(res);
            }

            next();
        } else {
            Result.Failure(`unable to find container`, 404).asResponse(res);
            next();
        }
    }

    private static async deleteSession(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            
            const url = Config.serval_url + `/containers/${req.container.id}/sessions/${req.params.sessionID}`;

            try {
                const response = await fetch(url, {
                    method: "DELETE",
                });

                if (response.ok){
                    Result.Success(response.statusText).asResponse(res);
                }
            } catch (error) {
                Result.Failure(`failed to delete session: ${error}`, 500).asResponse(res);
            }

            next();
        } else {
            Result.Failure(`unable to find container`, 404).asResponse(res);
            next();
        }
    }

    private static async getSession(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            const url = Config.serval_url + `/containers/${req.container.id}/sessions/${req.params.sessionID}`;
            
            try {
                const response = await fetch(url);
                const reader = response?.body?.pipeThrough(new TextDecoderStream()).getReader();

                while (reader) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    Result.Success(value).asResponse(res);
                } 
            } catch (error) {
                Result.Failure(`failed to get session: ${error}`, 500).asResponse(res);
            }

            next();
        } else {
            Result.Failure(`unable to find container`, 404).asResponse(res);
            next();
        }
    }

    // retrieves all sessions for the container
    private static async listSessions(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            const url = Config.serval_url + `/containers/${req.container.id}/sessions`;

            try {
                const response = await fetch(url);
                const reader = response?.body?.pipeThrough(new TextDecoderStream()).getReader();

                while (reader) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    Result.Success(value).asResponse(res);
                } 
            } catch (error) {
                Result.Failure(`failed to list sessions: ${error}`, 500).asResponse(res);
            }

            next();
        } else {
            Result.Failure(`unable to find container`, 404).asResponse(res);
            next();
        }
    }

    private static async listObjects (req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            const url = Config.serval_url + `/containers/${req.container.id}/sessions/${req.params.sessionID}/objects`;

            try {
                const response = await fetch(url);
                const reader = response?.body?.pipeThrough(new TextDecoderStream()).getReader();

                while (reader) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    Result.Success(value).asResponse(res);
                } 
            } catch (error) {
                Result.Failure(`failed to list objects: ${error}`, 500).asResponse(res);
            }

            next();
        } else {
            Result.Failure(`unable to find container`, 404).asResponse(res);
            next();
        }
    }

    private static async getObject (req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            
            const url = Config.serval_url + `/containers/${req.container.id}/sessions/${req.params.sessionID}/objects/${req.params.objectID}`;

            try {
                const response = await fetch(url);
                const reader = response?.body?.pipeThrough(new TextDecoderStream()).getReader();

                while (reader) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    Result.Success(value).asResponse(res);
                } 
            } catch (error) {
                Result.Failure(`failed to get object: ${error}`, 500).asResponse(res);
            }

            next();
        } else {
            Result.Failure(`unable to find container`, 404).asResponse(res);
            next();
        }
    }

    private static async deleteObject (req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            
            const url = Config.serval_url + `/containers/${req.container.id}/sessions/${req.params.sessionID}/objects/${req.params.objectID}`;
            
            try {
                const response = await fetch(url, {
                    method: "DELETE",
                })

                if (response.ok){
                    Result.Success(response.statusText).asResponse(res);
                }
            } catch (error) {
                Result.Failure(`failed to delete object: ${error}`, 500).asResponse(res);
            }

            next();
        } else {
            Result.Failure(`unable to find container`, 404).asResponse(res);
            next();
        }
    }

    private static async listPlayers (req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            
            const url = Config.serval_url + `/containers/${req.container.id}/sessions/${req.params.sessionID}/players`;
            
            try {
                const response = await fetch(url);
                const reader = response?.body?.pipeThrough(new TextDecoderStream()).getReader();

                while (reader) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    Result.Success(value).asResponse(res);
                } 
            } catch (error) {
                Result.Failure(`failed to list players: ${error}`, 500).asResponse(res);
            }

            next();
        } else {
            Result.Failure(`unable to find container`, 404).asResponse(res);
            next();
        }
    }

    private static async getPlayer (req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            
            const url = Config.serval_url + `/containers/${req.container.id}/sessions/${req.params.sessionID}/players/${req.params.playerID}`;
            
            try {
                const response = await fetch(url);
                const reader = response?.body?.pipeThrough(new TextDecoderStream()).getReader();

                while (reader) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    Result.Success(value).asResponse(res);
                } 
            } catch (error) {
                Result.Failure(`failed to get player: ${error}`, 500).asResponse(res);
            }

            next();
        } else {
            Result.Failure(`unable to find container`, 404).asResponse(res);
            next();
        }
    }

    private static async deletePlayer (req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            
            const url = Config.serval_url + `/containers/${req.container.id}/sessions/${req.params.sessionID}/players/${req.params.playerID}`;
            
            try {
                const response = await fetch(url, {
                    method: "DELETE",
                });

                if (response.ok){
                    Result.Success(response.statusText).asResponse(res);
                }
            } catch (error) {
                Result.Failure(`failed to delete player: ${error}`, 500).asResponse(res);
            }

            next();
        } else {
            Result.Failure(`unable to find container`, 404).asResponse(res);
            next();
        }
    }
}

const instance: ServalRoutes = new ServalRoutes();
