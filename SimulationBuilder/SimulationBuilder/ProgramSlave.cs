using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.Linq;
using System.Text;

namespace SimulationBuilder
{
    class ProgramSlave
    {
        public static void MainSlave(string[] args)
        {
            if (args.Length < 2)
            {
                Console.WriteLine("USAGE: SimulationBuilder --slave hostWCFendpoint");
                return;
            }

            int maxParallel;
            if (!int.TryParse(ConfigurationManager.AppSettings["maxParallel"], out maxParallel))
                maxParallel = Environment.ProcessorCount;

            Console.WriteLine("Starting threads");


            HostProxy.SimulationHostClient proxy = new HostProxy.SimulationHostClient("BasicHttpBinding_ISimulationHost", args[1]);

            for (int i = 0; i < maxParallel; i++)
            {
                var t = new System.Threading.Thread(() =>
                {
                    // make to not hammer the host all at the same time
                    Random rnd = new Random(System.Guid.NewGuid().GetHashCode());
                    System.Threading.Thread.Sleep(rnd.Next(5000));

                    try
                    {
                        DateTime cur = DateTime.MinValue;
                        while (true)
                        {
                            if ((DateTime.UtcNow - cur).TotalSeconds > 5)
                            {
                                try
                                {
                                    HostProxy.SimulationJob simJob;
                                    lock (proxy)
                                        simJob = proxy.GetSimulationJob(Environment.MachineName);
                                    try
                                    {

                                        if (simJob != null)
                                        {
                                            Stopwatch sw = new Stopwatch();
                                            sw.Start();
                                            Console.WriteLine("Received simulation job " + simJob.Index + ", running simulation");
                                            SimulationManager.RunSimulation(simJob.FinalArguments);
                                            sw.Stop();
                                            lock (proxy)
                                                proxy.SimulationJobDone(simJob.SimulationBatchGUID, Environment.MachineName, simJob.Index, sw.ElapsedTicks);
                                        }
                                    }
                                    catch (Exception ex)
                                    {
                                        lock (proxy)
                                            proxy.SimulationJobFailed(simJob.SimulationBatchGUID, Environment.MachineName, simJob.Index, ex.Message);

                                        Console.WriteLine("Error: " + ex.GetType().FullName + " - " + ex.Message);
                                    }
                                }
                                catch (Exception ex)
                                {
                                    // don't spam not able to connect
                                }

                                cur = DateTime.UtcNow;
                            }
                            else
                                System.Threading.Thread.Sleep(25);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.Error.Write("Error: " + ex.GetType().FullName + " - " + ex.Message + Environment.NewLine + ex.StackTrace);
                    }
                });
                t.Start();
            }
        }
    }
}
