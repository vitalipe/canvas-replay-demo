/**
 * Created by user on 7/27/2015.
 */

// vanilla js FTW!!!! :P
((function(canvas) {
    "use strict";

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

        var createWayPoint = function(e) {
            var  rect = element.getBoundingClientRect();
            return {
                x : e.pageX - (rect.left),
                y : e.pageY - (rect.top),
                time : Date.now()
            };
        };

        var WaitingState = function(e) {
            var wayPoint = createWayPoint(e);
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
        };
    };


    /*
     * Should handle all the drawing logic
     */
    var DrawController = function(canvas, paths, tool) {
        var _ctx = canvas.getContext("2d");
        var _clone = canvas.cloneNode().getContext("2d");
        var _snapshot = canvas.cloneNode().getContext("2d");
        var _currentPath = [];

        var render = function() {
            _ctx.clearRect(0, 0, canvas.width, canvas.height);

            _ctx.drawImage(_snapshot.canvas, 0, 0);
            _ctx.drawImage(_clone.canvas, 0, 0);
        };

        this.onDrawStart = function(wayPoint) {
            _currentPath = [wayPoint];

            _snapshot.drawImage(canvas, 0, 0);
            _clone.clearRect(0, 0, canvas.width, canvas.height);

            tool.start(wayPoint.x, wayPoint.y, _clone);
            render();
        };

        this.onDrawAt = function(wayPoint) {
            _currentPath.push(wayPoint);

            tool.draw(wayPoint.x, wayPoint.y, _clone);
            render();
        };

        this.onDrawEnd = function(wayPoint) {
            paths.push(_currentPath);

            tool.end(wayPoint.x, wayPoint.y, _clone);
            _snapshot.drawImage(canvas, 0, 0);

            render();
        };
    };



    // hook it together :)
    // I'm a horrible developer :P
    var paths = [];
    var input = new InputHandler(canvas);
    var tool = new BrushTool();
    var drawController = new DrawController(canvas, paths, tool);

    input.onDrawStart(drawController.onDrawStart);
    input.onDrawAt(drawController.onDrawAt);
    input.onDrawEnd(drawController.onDrawEnd);



})(document.getElementById("viewport")));