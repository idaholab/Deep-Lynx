import {BaseDomainClass} from "../common_classes/base_domain_class";
import {IsNumber, IsOptional, IsString, IsUUID} from "class-validator";

/*
    Task is a queue specific data structure - the queue processor stores events
    to be emitted in the database using this structure.
 */
export default class Task extends BaseDomainClass {
    @IsOptional()
    @IsUUID()
    id?: string

    task?: string

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
        task?: string,
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
