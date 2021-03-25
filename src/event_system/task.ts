import {BaseDomainClass} from "../common_classes/base_domain_class";
import {IsNumber, IsOptional, IsString, IsUUID} from "class-validator";
import Event from "./event"
import {Type} from "class-transformer";

export default class Task extends BaseDomainClass {
    @IsOptional()
    @IsUUID()
    id?: string

    @Type(() => Event)
    task: Event[] = []

    @IsOptional()
    @IsNumber()
    priority?: number

    @IsOptional()
    @IsNumber()
    added?: number

    @IsOptional()
    @IsString()
    lock?: string

    constructor(input?: {
        priority?: number,
        task?: Event[],
        added?: number
    }) {
        super();

        if(input) {
            if(input.priority) this.priority = input.priority
            if(input.task) this.task = input.task
            if(input.added) this.added = input.added
        }
    }
}
