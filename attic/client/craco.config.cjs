module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Disable fullySpecified enforcement so ESM imports without extensions work
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        fullySpecified: false
      };
      return webpackConfig;
    }
  }
};
