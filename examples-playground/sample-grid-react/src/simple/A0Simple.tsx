import React, { FC } from 'react';
import { covidTill0721 } from 'sample-grid-vanilla';

export const App: FC = () => {
  return (
    <div>
      <input type='' />
      <h2>A0Simple </h2>
      {covidTill0721.results.map((item, index) => (
        <p key={index}>
          {item.countryName} &nbsp;&nbsp; {item.confirmedCount}
        </p>
      ))}
    </div>
  );
};

export default App;
