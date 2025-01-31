import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidTimeZoneConstraint implements ValidatorConstraintInterface {
  validate(timeZone: string) {
    try {
      return Intl.DateTimeFormat(undefined, { timeZone }).resolvedOptions().timeZone === timeZone;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Invalid time zone provided.';
  }
}

export function isValidTimeZone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsValidTimeZoneConstraint,
    });
  };
}
