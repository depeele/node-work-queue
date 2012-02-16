/** @file
 *
 *  A simple, syncrhonous work-queue.
 *
 */
var util    = require('util'),
    events  = require('events'),
    queue   = [],
    tid     = 0;

function Task(run, complete, label)
{
    events.EventEmitter.call(this);

    this.tid      = ++tid;
    this.label    = (label ? label : 'task #'+ this.tid);
    this.run      = run;
    this.complete = complete;

    return this;
}
util.inherits(Task, events.EventEmitter);


module.exports = {
    /** @brief  Add a task to the queue.
     *  @param  run         The function to invoke when this task is ready for
     *                      execution.  When the task completes, it MUST invoke
     *                      next(err, res) to keep the task queue processing.
     *                          run(state, next)
     *  @param  complete    If provided, this function will be invoked once
     *                      run() completes.  If this function returns false,
     *                      tasking will cease
     *                          complete(state, err, res) { return true; }
     *  @param  label   If provided, a label for this task;
     *
     *  @return this for a fluent interface;
     */
    addTask: function(run, complete, label) {
        if ( typeof run !== 'function' )
        {
            throw new Error("A task must have an 'run' function");
        }

        complete = (complete && (typeof complete === 'function')
                        ? complete
                        : function(state, err, res) { return true; });


        queue.push( new Task(run, complete, label) );

        return this;
    },

    /** @brief  Pop the next task and begin its execution.
     *  @param  state   The current processing state;
     *
     *  @return this for a fluent interface;
     */
    next: function(state) {
        var self    = this,
            task;

        if ( (queue.length > 0) && (task = queue.shift()) )
        {
            task.run.call(task, state, function(err, res) {
                // If the callback returns false, terminate processing
                if (task.complete.call(task, state, err, res) === false)
                {
                    return;
                }

                // Invoke the next task
                self.next(state);
            });
        }

        return this;
    }
};
