import React, {useState} from 'react';
import ReactMarkdown from 'react-markdown';

import BaseInputValue from './BaseInputValue';

const MarkdownValue = props => {
    // Show the editor if the user chose to edit
    // or if there is no value yet
    const [showEdit, setShowEdit] = useState(true);

    return (
        <div onClick={() => setShowEdit(true)}>
            {showEdit ? (
                <BaseInputValue
                    {...props}
                    autoFocus={showEdit && !!props.entry.value}
                    onBlur={() => {
                        if (props.entry.value.trim() !== '') {
                            setShowEdit(false);
                        }
                    }}
                    type="text"
                />
            ) : (
                <ReactMarkdown>{props.entry.value}</ReactMarkdown>
            )}
        </div>
    );
};

MarkdownValue.defaultProps = {
    entry: {value: ''}
};

export default MarkdownValue;
