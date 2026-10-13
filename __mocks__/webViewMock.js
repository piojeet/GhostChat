const React = require('react');
const { View } = require('react-native');

const WebView = React.forwardRef((props, ref) =>
  React.createElement(View, { ...props, ref }, null),
);

module.exports = WebView;
module.exports.default = WebView;
