import Result from "../../../../common_classes/result";
import VectorMapper from "../../../mappers/data_warehouse/data/vector_mapper";
import VectorData from "../../../../domain_objects/data_warehouse/data/vector";

export default class VectorRepository {
    public async copyFromJson(embeddings: VectorData[]): Promise<Result<boolean>> {
        for (const e of embeddings) {
            const errors = await e.validationErrors();
            if (errors) {
                const readableErrors = errors.map(e => Object.values(JSON.parse(e)['constraints'])[0]);
                return Promise.resolve(Result.Failure(`some embeddings do not pass validation: ${readableErrors.join(', ')}`));
            }
        }
        const mapper = VectorMapper.Instance;
        return mapper.CopyFromJson(embeddings);
    }
}