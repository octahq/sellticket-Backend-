import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsEndDateAfterStartDateConstraint implements ValidatorConstraintInterface {
  validate(endDate: string, args: any) {
    const startDate = args.object[args.constraints[0]];
    return new Date(endDate) > new Date(startDate);
  }

  defaultMessage() {
    return 'End date must be after start date.';
  }
}

export function IsEndDateAfterStartDate(startDateField: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [startDateField],
      options: validationOptions,
      validator: IsEndDateAfterStartDateConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    const now = new Date();
    const inputDate = new Date(value);
    return inputDate > now; // ✅ Only allow future dates
  }

  defaultMessage() {
    return 'Start date must be in the future.';
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsFutureDateConstraint,
    });
  };
}
