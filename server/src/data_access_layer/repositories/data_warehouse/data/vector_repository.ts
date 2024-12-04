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

    // we use "any" instead of number in case the embedding is a deeply nested array
    public async similaritySearch(embedding: any[], limit?: number): Promise<Result<TextResult[]>> {
        // TODO: figure out why this is so many layers deeply nested
        let searchData = embedding;
        while (searchData.length === 1) {
            const innerData = searchData[0];
            searchData = innerData;
        }
        console.log(limit);
    
        const searchLimit = limit ? limit : 5

        return this.#mapper.SearchByDistance(searchData, searchLimit);
    }
}