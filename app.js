/**
 * Created by user on 7/27/2015.
 */

// vanilla js FTW!!!! :P
var App = ((function() {
    "use strict";

    var canvas = document.getElementById("viewport");
    var replayButton = document.getElementById("replay-button");

    /*
     * This Class abstracts input event management, and will
     * send us wayPoint objects with normalized coordinates & timestamps
     */
    var InputHandler = function(element) {
        // private
        var _onDrawStart = function() {};
        var _onDrawAt = function() {};
        var _onDrawEnd = function() {};
        var _state = null;
        var _firstUpdate = null;

        var createWayPoint = function(e, initialTime) {
            var  rect = element.getBoundingClientRect();

            if (initialTime)
                _firstUpdate = e.timeStamp;

            return {
                x : e.pageX - rect.left,
                y : e.pageY - rect.top,
                deltaTime : (e.timeStamp - _firstUpdate)
            };
        };

        var WaitingState = function(e) {
            var wayPoint = createWayPoint(e, e.timeStamp);
            if (e.which != 1)// accept only left clicks
                return;

            if (e.type !== "mousedown")
                return;

            _state = DrawingState;
            _onDrawStart(wayPoint);
        };

        var DrawingState = function(e) {
            var wayPoint = createWayPoint(e);
            if (e.which != 1)// accept only left clicks
                    return;

            if (e.type === "mouseup" || e.type === "mouseout") {
                _state = WaitingState;
                _onDrawEnd(wayPoint);
            }

            if (e.type === "mousemove") {
                _onDrawAt(wayPoint);
            }
        };

        var handleInputEvent = function(e) { return _state(e)};

        // connect mouse events only :P
        element.addEventListener("mouseup", handleInputEvent);
        element.addEventListener("mouseout", handleInputEvent);
        element.addEventListener("mousemove", handleInputEvent);
        element.addEventListener("mousedown", handleInputEvent);

        _state = WaitingState;

        // public
        this.onDrawStart = function(handler) { _onDrawStart = handler; };
        this.onDrawAt = function(handler) { _onDrawAt = handler; };
        this.onDrawEnd = function(handler) {_onDrawEnd = handler; };

    };

    /*
     * A simple implementation for a tool interface
     */
    var BrushTool = function() {
        this.start = function(x, y, ctx) {

            ctx.strokeStyle = "yellow";
            ctx.lineJoin = "round";
            ctx.lineWidth = 4;

            ctx.beginPath();
            ctx.moveTo(x,y);
        };

        this.draw = function(x, y, ctx) {

            ctx.lineTo(x, y);
            ctx.stroke();

            ctx.moveTo(x, y);
        };

        this.end = function(x, y, ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.closePath();
        };
    };


    /*
     * Should handle all the drawing logic
     */
    var Painter = function(canvas, tool) {
        var _ctx = canvas.getContext("2d");
        var _clone = canvas.cloneNode().getContext("2d");
        var _snapshot = canvas.cloneNode().getContext("2d");

        var render = function() {

            _ctx.clearRect(0, 0, canvas.width, canvas.height);

            _ctx.drawImage(_snapshot.canvas, 0, 0);
            _ctx.drawImage(_clone.canvas, 0, 0);
        };

        this.drawStart = function(wayPoint) {

            _snapshot.drawImage(canvas, 0, 0);
            _clone.clearRect(0, 0, canvas.width, canvas.height);

            tool.start(wayPoint.x, wayPoint.y, _clone);
            render();
        };

        this.drawAt = function(wayPoint) {

            tool.draw(wayPoint.x, wayPoint.y, _clone);
            render();
        };

        this.drawEnd = function(wayPoint) {
            tool.end(wayPoint.x, wayPoint.y, _clone);
            _snapshot.drawImage(canvas, 0, 0);

            render();
        };

        this.clear = function() {
            _ctx.clearRect(0, 0, canvas.width, canvas.height);
            _snapshot.clearRect(0, 0, canvas.width, canvas.height);
            _clone.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    /*
     * Should listen to draw events, record paths and delegate render to Painter
     */
    var DrawController = function(painter, paths) {
        var _currentPath = [];

        this.onDrawStart = function(wayPoint) {
            _currentPath = [wayPoint];
            painter.drawStart(wayPoint);
        };

        this.onDrawAt = function(wayPoint) {
            _currentPath.push(wayPoint);
            painter.drawAt(wayPoint);
        };

        this.onDrawEnd = function(wayPoint) {
            _currentPath.push(wayPoint);
            paths.push(_currentPath);

            painter.drawEnd(wayPoint);
        };
    };

    // because real men don't use libraries :P
    var asyncLoop = function(collection, action, onDone) {
        onDone = (onDone || function() {});

        if (collection.length === 0 )
            return onDone();

        action(collection[0], function() {
            asyncLoop(collection.slice(1), action, onDone);
        });
    };

    /*
     * Implements all the nasty async replay logic
     */
    var ReplayController = function(painter) {
        var _locked = false;

        this.replay = function() {
            if (_locked)
                return;

            _locked = true;
            painter.clear();

            asyncLoop(paths, function(path, next) {

                if (path.length === 0)
                    return next();

                var offsetTime = null; // from the first anim frame
                var index = 0;

                var renderWayPoint = function(index) {
                    if (index === 0)
                        painter.drawStart(path[0]);

                    if (index === path.length-1)
                        painter.drawEnd(path[index]);

                    painter.drawAt(path[index]);
                };

                var renderNextFrame = function(timestamp) {
                    if (!offsetTime)
                        offsetTime = timestamp;

                    var currentTime = (timestamp - offsetTime);

                    while (path[index].deltaTime <= currentTime) {
                        if (index === path.length-1)
                            return next();

                        renderWayPoint(index);
                        index++;
                    }

                    requestAnimationFrame(renderNextFrame);
                };

                // dispatch first
                requestAnimationFrame(renderNextFrame);

            }, function() { _locked = false});
        }

    };



    // hook it together :)
    var paths = [];  // I'm a horrible developer :P

    var input = new InputHandler(canvas);
    var tool = new BrushTool();
    var painter = new Painter(canvas, tool);
    var drawController = new DrawController(painter, paths);
    var replayController = new ReplayController(painter);

    input.onDrawStart(drawController.onDrawStart);
    input.onDrawAt(drawController.onDrawAt);
    input.onDrawEnd(drawController.onDrawEnd);

    replayButton.addEventListener("click", replayController.replay);


    return {
        paths : paths,
        replayController : replayController,
        painter : painter
    }

})());