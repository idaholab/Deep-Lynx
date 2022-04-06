import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'dataRetentionDays', async: false })
export class DataRetentionDays implements ValidatorConstraintInterface {
    validate(v: number) {
        return typeof v === 'number' && v >= -1  // for async validations you must return a Promise<boolean> here
    }

    defaultMessage(args: ValidationArguments) {
        // here you can provide default error message if validation failed
        return 'Data Retention must be an integer greater than or equal to -1';
    }
}
