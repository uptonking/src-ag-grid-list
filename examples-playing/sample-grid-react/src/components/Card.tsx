import React from 'react';
import { CardContent } from './CardContent';

export const Card = ({ size }) => {
  return (
    <div style={{ padding: size ? size : 12, backgroundColor: 'beige' }}>
      <h3>Card标题</h3>
      <CardContent>内容部分11111111</CardContent>
    </div>
  );
};
