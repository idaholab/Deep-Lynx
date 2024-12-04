import Result from "../../../../common_classes/result";
import VectorMapper from "../../../mappers/data_warehouse/data/vector_mapper";
import VectorData, { TextResult } from "../../../../domain_objects/data_warehouse/data/vector";

export default class VectorRepository {
    #mapper: VectorMapper = VectorMapper.Instance;
    public async uploadFromJson(embeddings: VectorData[]): Promise<Result<boolean>> {
        for (const e of embeddings) {
            const errors = await e.validationErrors();
            if (errors) {
                const readableErrors = errors.map(e => Object.values(JSON.parse(e)['constraints'])[0]);
                return Promise.resolve(Result.Failure(`some embeddings do not pass validation: ${readableErrors.join(', ')}`));
            }
        }
        return this.#mapper.UploadFromJson(embeddings);
    }

    // TODO: add method and limit
    // we use "any" instead of number in case the embedding is a deeply nested array
    public async similaritySearch(embedding: any[]): Promise<Result<TextResult[]>> {
        // TODO: figure out why this is so many layers deeply nested
        let oldData = embedding;
        while (oldData.length === 1) {
            const newData = oldData[0];
            oldData = newData;
        }

        // setting this manually for now, TODO replace later with a param
        const method = 'distance';
        if (method === 'distance') {
            // TODO replace later with a manual limit
            return this.#mapper.SearchByDistance(oldData, 5);
        } else if (method === 'cosine') {
            return this.#mapper.SearchByCosine(oldData, 5);
        }

        // default statement if invalid method is chosen
        return Promise.resolve(Result.Failure('unable to execute query, use either distance or cosine search'));
    }
}