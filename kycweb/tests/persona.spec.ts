import {test_passport,test_driverLicense} from './testObjects';
import {filterFields,PersonaResults} from '../kycUtils';

describe('persona tests', () => { 
    it('can parse only needed info from passport',()=>{
        const result = filterFields(test_passport);
        console.dir(result);
        expect(result.fields.length).toBe(1);
    })
    it('can parse only needed info from driver license',()=>{
        const result = filterFields(test_driverLicense);
        console.dir(result);
        expect(result.fields.length).toBe(1);
    })
 })