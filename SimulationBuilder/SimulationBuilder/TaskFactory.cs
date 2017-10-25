using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;

namespace RunTimeDebuggers.Helpers
{
    class TaskFactory
    {
        private List<Thread> threadPool = new List<Thread>();

        private int threadPoolSize;
        private ThreadPriority priority;

        private Queue<Action> tasks = new Queue<Action>();

        public interface ITask
        {
             void Execute();
        }

        private class Task : ITask
        {

           
            public Action TaskBody { get; set; }
            public Action OnCompletion { get; set; }

            public void Execute()
            {
                TaskBody();

                if (OnCompletion != null)
                    OnCompletion();
            }
        }

        private class Task<TParam> : ITask
        {
         
            public TParam Param { get; set; }

            public Action<TParam> TaskBody { get; set; }
            public Action OnCompletion { get; set; }

            public void Execute()
            {
                TaskBody(Param);

                if (OnCompletion != null)
                    OnCompletion();
            }
        }

        private class Task<TParam, TResult> : ITask
        {
         
            public TParam Param { get; set; }

            public Func<TParam, TResult> TaskBody { get; set; }
            public Action<TResult> OnCompletion { get; set; }

            public TResult Result { get; private set; }

            public void Execute()
            {
                Result = TaskBody(Param);

                if (OnCompletion != null)
                    OnCompletion(Result);
            }
        }

        private object threadPoolLock = new object();
        public int ThreadPoolCount { get { lock (threadPoolLock) return threadPool.Count; } }

        private object taskPoolLock = new object();
        public int RemainingTaskCount { get { lock (taskPoolLock) return tasks.Count; } }

        public TaskFactory(int threadPoolSize)
            : this(threadPoolSize, ThreadPriority.Normal)
        {
        }

        public TaskFactory(int threadPoolSize, ThreadPriority priority)
        {
            this.threadPoolSize = threadPoolSize;
            this.priority = priority;
        }

        public ITask StartTask<TParam, TResult>(Func<TParam, TResult> taskBody, TParam data, Action<TResult> onCompletion)
        {
            ITask task = new Task<TParam, TResult>() { Param = data, TaskBody = taskBody, OnCompletion = onCompletion };
            EnqueueTask(task);
            return task;
        }

        public ITask StartTask<TParam>(Action<TParam> taskBody, TParam data, Action onCompletion)
        {
            ITask task = new Task<TParam>() { Param = data, TaskBody = taskBody, OnCompletion = onCompletion };
            EnqueueTask(task);
            return task;
        }

        public ITask StartTask(Action taskBody, Action onCompletion)
        {
            ITask task = new Task() { TaskBody = taskBody, OnCompletion = onCompletion };
            EnqueueTask(task);
            return task;
        }

        private int nrOfTasksEnqueued = 0;

        private void EnqueueTask(ITask task)
        {
            Action taskRunner = task.Execute;

            lock (taskPoolLock)
            {
                tasks.Enqueue(taskRunner);
                nrOfTasksEnqueued++;
            }

            Start();
        }


        private void Start()
        {
            while (ThreadPoolCount <= Math.Min(threadPoolSize, RemainingTaskCount))
            {
                Thread t = new Thread(ProcessTasks);
                t.Priority = priority;
                lock (threadPool)
                    threadPool.Add(t);

                t.Start(t);
            }
        }

        private void ProcessTasks(object t)
        {
            try
            {
                while (RemainingTaskCount > 0)
                {
                    Action task;

                    lock (taskPoolLock)
                    {
                        if (tasks.Count <= 0)
                            break;

                        task = tasks.Dequeue();
                    }

                    task();
                }
            }
            finally
            {
                lock (threadPool)
                    threadPool.Remove((Thread)t);
            }            
        }


        internal void WaitAll()
        {
            while (true)
            {
                lock (taskPoolLock)
                {
                    lock (threadPool)
                    {
                        if (tasks.Count <= 0 && threadPool.Count <= 0)
                            break;
                    }
                }
                System.Threading.Thread.Sleep(100);
            }
        }

        public double Progress
        {
            get
            {
                int count;
                lock(taskPoolLock)
                    count = tasks.Count;

                lock (threadPoolLock)
                    count += threadPool.Count;

                return 1 - ((double)count / (double)nrOfTasksEnqueued);
            }
        }
    }
}
