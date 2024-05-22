import { expect } from 'chai';
import { stringToValidPropertyName } from '../../../services/utilities';

describe('The String to Valid Property Name function', async () => {
    it('can convert spaces to underscores', async () => {
        const initial_string = 'Metatype with spaces';
        const new_string = stringToValidPropertyName(initial_string);
        expect(new_string).eq('Metatype_with_spaces');
        expect(new_string.split(" ").length - 1).eq(0);
    });

    it('can convert special characters to underscores', async () => {
        const initial_string = 'Non`~!@#$%^&*()-+={}[];:"<>,.?/|\\\\Sense';
        const new_string = stringToValidPropertyName(initial_string);
        expect(new_string).eq('Non_Sense');
    });

    it('can condense any number of characters and spaces', async () => {
        const initial_string = 'Alternating - dashes- -and - spaces';
        const new_string = stringToValidPropertyName(initial_string);
        expect(new_string).eq('Alternating_dashes_and_spaces');
        expect(new_string).not.eq('Alternating___dashes___and___spaces');
        expect((new_string.match(/_/g) || []).length).eq(3);
        expect((new_string.match(/_/g) || []).length).not.eq(9);
    });
});