var BlinkDiff = require('blink-diff'),
    assert = require('assert'),
    path = require('path'),
    util = require('util');

/**
 * Pix-diff protractor plugin class
 *
 * @constructor
 * @class PixDiff
 * @param {object} options
 * @param {string} options.basePath Path to screenshots folder
 * @param {string} options.width Width of browser
 * @param {string} options.height Height of browser
 *
 * @property {string} _basePath
 * @property {int} _width
 * @property {int} _height
 * @property {object} _capabilities
 * @property {webdriver|promise} _flow
 */
function PixDiff(options) {
    this._basePath = options.basePath;
    assert.ok(options.basePath, "Image base path not given.");

    this._width = options.width || 1280;
    this._height = options.height || 1024;

    this._capabilities = null;

    this._flow = browser.controlFlow();

    // init
    browser.driver.manage().window().setSize(this._width, this._height)
        .then(function () {
            return browser.getCapabilities()
        })
        .then(function (data) {
            return this._capabilities = data.caps_;
        }.bind(this));
}

PixDiff.prototype = {

    /**
     * Merges non-default options from optionsB into optionsA
     *
     * @method _mergeDefaultOptions
     * @param {object} optionsA
     * @param {object} optionsB
     * @return {object}
     * @private
     */
    _mergeDefaultOptions: function (optionsA, optionsB) {
        var option;

        optionsB = (typeof optionsB === 'object') ? optionsB : {};

        for (option in optionsB) {
            if (!optionsA.hasOwnProperty(option)) {
                optionsA[option] = optionsB[option];
            }
        }
        return optionsA;
    },

    /**
     * Runs the comparison against the screen
     *
     * @method checkScreen
     * @example
     *     browser.pixImage.checkScreen('imageA', {debug: true});
     *
     * @param {string} tag
     * @param {object} options
     * @return {object} result
     * @public
     */
    checkScreen: function (tag, options) {
        var defaults;

        return this._flow.execute(function () {
            return browser.takeScreenshot()
                .then(function (image) {
                    tag = util.format('%s-%s-%sx%s.png', tag, this._capabilities.browserName, this._width, this._height);
                    defaults = {
                        imageAPath: path.join(this._basePath, tag),
                        imageB: new Buffer(image, 'base64'),
                        imageOutputPath: path.join(this._basePath, 'diff', tag),
                        imageOutputLimit: BlinkDiff.OUTPUT_DIFFERENT
                    };
                    return new BlinkDiff(this._mergeDefaultOptions(defaults, options)).runWithPromise();
                }.bind(this))
                .then(function (result) {
                    return result;
                });
        }.bind(this));
    },

    /**
     * Runs the comparison against a region
     *
     * @method checkRegion
     * @example
     *     browser.pixImage.checkScreen(element(By.id('elementId')), 'imageA', {debug: true});
     *
     * @param {promise} element
     * @param {string} tag
     * @param {object} options
     * @return {object}
     * @public
     */
    checkRegion: function (element, tag, options) {
        var size,
            rect,
            defaults;

        return this._flow.execute(function () {
            return element.getSize()
                .then(function (elementSize) {
                    size = elementSize;
                    return element.getLocation();
                })
                .then(function (point) {
                    rect = {height: size.height, width: size.width, x: point.x, y: point.y};
                    return browser.takeScreenshot();
                })
                .then(function (image) {
                    tag = util.format('%s-%s-%sx%s.png', tag, this._capabilities.browserName, this._width, this._height);
                    defaults = {
                        imageAPath: path.join(this._basePath, tag),
                        imageB: new Buffer(image, 'base64'),
                        imageOutputPath: path.join(this._basePath, 'diff', tag),
                        imageOutputLimit: BlinkDiff.OUTPUT_DIFFERENT,
                        cropImageB: rect
                    };
                    return new BlinkDiff(this._mergeDefaultOptions(defaults, options)).runWithPromise();
                }.bind(this))
                .then(function (result) {
                    return result;
                });
        }.bind(this));
    }
};

/**
 * Jasmine PixDiff matchers
 */
(function () {
    var matchers = {
        toMatch: function () {
            var result = this.actual,
                percent = +((result.differences / result.dimension) * 100).toFixed(2);
            this.message = function () {
                return util.format("Image is visibly different by %s pixels, %s", result.differences, percent);
            };
            return ((result.code === BlinkDiff.RESULT_IDENTICAL) || (result.code === BlinkDiff.RESULT_SIMILAR));
        },

        toNotMatch: function () {
            var result = this.actual;
            this.message = function () {
                return "Image is identical or near identical";
            };
            return ((result.code === BlinkDiff.RESULT_DIFFERENT) && (result.code !== BlinkDiff.RESULT_UNKNOWN));
        }
    };

    beforeEach(function () {
        this.addMatchers(matchers);
    });
})();

module.exports = PixDiff;