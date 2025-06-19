import React, { useState } from 'react';
import styled from 'styled-components';

const TagSelection = () => {
  const [tags, setTags] = useState([]);

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tags.length < 3) {
      setTags([...tags, e.target.value]);
      e.target.value = '';
    }
  };

  return (
    <Container>
      <TagInput onKeyDown={handleAddTag} placeholder="Enter up to 3 tags" />
      <TagContainer>
        {tags.map((tag, index) => (
          <Tag key={index}>{tag}</Tag>
        ))}
      </TagContainer>
    </Container>
  );
};

const Container = styled.div`
  margin-top: 20px;
`;

const TagInput = styled.input`
  padding: 10px;
  width: 200px;
`;

const TagContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
`;

const Tag = styled.div`
  padding: 5px 10px;
  background-color: #eee;
  border-radius: 5px;
`;

export default TagSelection;