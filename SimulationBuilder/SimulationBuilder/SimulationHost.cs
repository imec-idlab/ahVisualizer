using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.ServiceModel.Channels;
using System.ServiceModel.Web;
using System.Text;

namespace SimulationBuilder
{
    [ServiceBehavior(InstanceContextMode = InstanceContextMode.Single)]
    public class SimulationHost : ISimulationHost
    {
        private Dictionary<string, string> baseArgs;
        private List<Dictionary<string, string>> combos;
        private string nssFolder;

        private object lockObj = new object();

        private int pendingJobs = 0;
        private HashSet<int> remainingJobs = new HashSet<int>();
        private Dictionary<int, int> jobFailedCount = new Dictionary<int, int>();

        private Status status;
        public SimulationHost(string nssFolder, Dictionary<string, string> baseArgs, List<Dictionary<string, string>> combos)
        {
            this.nssFolder = nssFolder;
            this.baseArgs = baseArgs;
            this.combos = combos;

            status = new SimulationBuilder.Status();
            for (int i = 0; i < combos.Count; i++)
                this.status.JobStatus.Add(Status.JobStatusEnum.Pending);

            status.SimulationBatchGUID = System.Guid.NewGuid().ToString();
            status.StartedOn = DateTime.Now;
            status.TotalNrOfSimulations = combos.Count;

            remainingJobs = new HashSet<int>(Enumerable.Range(0, combos.Count));
            jobFailedCount = remainingJobs.ToDictionary(p => p, p => 0);

        }

        public SimulationJob GetSimulationJob(string hostname)
        {
            lock (lockObj)
            {
                if (remainingJobs.Count == 0)
                    return null;
                else
                {
                    int curJob = remainingJobs.First();
                    remainingJobs.Remove(curJob);

                    pendingJobs++;
                    status.JobStatus[curJob] = Status.JobStatusEnum.Running;

                    Console.WriteLine(GetPrefix() + "Simulation " + curJob + "/" + combos.Count + " claimed by " + hostname + GetSuffix());

                    var finalArguments = Merge(baseArgs, combos[curJob]);
                    var name = SimulationManager.GetName(combos[curJob]);
                    finalArguments["--NSSFile"] = "\"" + System.IO.Path.Combine(nssFolder, name + ".nss") + "\"";
                    finalArguments["--Name"] = "\"" + name + "\"";
                    // finalArguments["--VisualizerIP"] = "\"" + "\""; // no visualization 

                    var simJob = new SimulationJob()
                    {
                        SimulationBatchGUID = status.SimulationBatchGUID,
                        Index = curJob,
                        TotalNrOfSimulations = combos.Count,
                        FinalArguments = finalArguments
                    };



                    return simJob;
                }
            }
        }

        private string GetSuffix()
        {
            return ", currently " + pendingJobs + " jobs active. " + remainingJobs.Count + " remaining.";
        }

        private string GetPrefix()
        {
            return "[" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "] ";
        }

        public void SimulationJobDone(string simulationBatchGUID, string hostname, int index, long elapsedTicks)
        {
            lock (lockObj)
            {

                var ts = TimeSpan.FromTicks(elapsedTicks);
                if (simulationBatchGUID == status.SimulationBatchGUID)
                {
                    pendingJobs--;
                    status.JobStatus[index] = Status.JobStatusEnum.Finished;
                    status.TotalTime = status.TotalTime.Add(ts);
                    status.NrOfSimulationsDone++;

                    Console.WriteLine(GetPrefix() + "Simulation " + index + "/" + combos.Count + " finished in " + ts.ToString() + " on " + hostname + GetSuffix());
                }
                else
                {
                    Console.WriteLine(GetPrefix() + "Simulation " + index + " from previous batch (" + simulationBatchGUID + ") finished in " + ts.ToString() + " on " + hostname + GetSuffix());
                }
            }
        }

        public void SimulationJobFailed(string simulationBatchGUID, string hostname, int index, string error)
        {
            lock (lockObj)
            {
                if (simulationBatchGUID == status.SimulationBatchGUID)
                {
                    jobFailedCount[index]++;
                    pendingJobs--;
                    status.JobStatus[index] = Status.JobStatusEnum.Failed;
                    Console.WriteLine(GetPrefix() + "Simulation " + index + "/" + combos.Count + " FAILED on " + hostname + ", error: " + error + GetSuffix());
                    if (jobFailedCount[index] > 10)
                    {
                        Console.WriteLine(GetPrefix() + "Simulation " + index + " failed too many times, it will not be queued anymore.");
                    }
                    else
                    {
                        remainingJobs.Add(index);
                    }
                }
                else
                {
                    Console.WriteLine(GetPrefix() + "Simulation " + index + " failed from a previous batch (" + simulationBatchGUID + ") on " + hostname + ", error: " + error + GetSuffix());
                }
            }
        }

        public Status GetStatus()
        {
            return status;
        }


        public Stream StatusPage()
        {
            WebOperationContext.Current.OutgoingResponse.ContentType = "text/html";
            return System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceStream("SimulationBuilder.simulationstatuspage.html");
        }


        private static Dictionary<string, string> Merge(Dictionary<string, string> baseArgs, Dictionary<string, string> customArgs)
        {
            var dic = new Dictionary<string, string>(baseArgs);
            foreach (var pair in customArgs)
            {
                dic[pair.Key] = pair.Value;
            }
            return dic;
        }

    }
}
