var queue   = require('./queue.js');

queue.addTask(one,  complete);
queue.addTask(two,  complete);
queue.addTask(three,complete);
queue.next({level: 0});


/** @brief  A shared-task completion routine.
 *  @param  state   Task state;
 *  @param  err     If NOT null, and error;
 *  @param  res     Any other result data;
 *
 *  @return false to terminate tasking;
 */
function complete(state, err, res)
{
    console.log('complete: tid#%d, label[ %s ], '
                +   'state[ %j ], err[ %j ], res[ %j ]',
                this.tid, this.label,
                state, err, res);

    return (err ? false : true);
}

function one(state, next)
{
    console.log('one: tid#%d, label[ %s ], state[ %j ]',
                this.tid, this.label, state);

    var pause   = 4;

    function wait()
    {
        console.log("one: wait...");
        state.level++;
        if (--pause <= 0)
        {
            // continue on...
            return next(null, 1);
        }

        setTimeout(wait, 100);
    }

    wait();
}

function two(state, next)
{
    console.log('two: tid#%d, label[ %s ], state[ %j ]',
                this.tid, this.label, state);

    state.level++;

    next( (Math.random() >= 0.5 ? {error: 'random error'} : null), 2);
}

function three(state, next)
{
    console.log('three: tid#%d, label[ %s ], state[ %j ]',
                this.tid, this.label, state);

    state.level++;

    next(null, 3);
}
