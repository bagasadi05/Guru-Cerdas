import { ValidationService } from '../services/ValidationService';
import { ValidationRules } from '../types';
import { FieldValues, Resolver } from 'react-hook-form';

export const validationResolver = <T extends FieldValues>(rules: ValidationRules): Resolver<T> => {
    return async (values) => {
        const result = ValidationService.validateForm(values, rules);

        if (result.isValid) {
            return {
                values: values as T,
                errors: {},
            };
        }

        return {
            values: {},
            errors: Object.entries(result.errors).reduce((acc, [key, message]) => ({
                ...acc,
                [key]: {
                    type: 'validation',
                    message,
                },
            }), {}),
        };
    };
};
