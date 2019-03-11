package io.fairspace.saturn.services.metadata.validation;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class ComposedValidatorTest {
    @Mock
    MetadataRequestValidator validator1;

    @Mock
    MetadataRequestValidator validator2;

    ComposedValidator validator;

    @Before
    public void setUp() throws Exception {
        validator = new ComposedValidator(validator1, validator2);
    }

    @Test
    public void testValidateComposed() {
        testCombination(true, true, true);
        testCombination(true, false, false);
        testCombination(false, true, false);
        testCombination(false, false, false);
    }

    private void testCombination(boolean validity1, boolean validity2, boolean expectedResult) {
        reset(validator1, validator2);

        doReturn(new ValidationResult(validity1, "test")).when(validator1).validatePut(any());
        doReturn(new ValidationResult(validity2, "test")).when(validator2).validatePut(any());

        ValidationResult result = validator.validateComposed(validator -> validator.validatePut(null));

        assertEquals(expectedResult, result.isValid());
        verify(validator1).validatePut(any());
        verify(validator2).validatePut(any());

    }
}
