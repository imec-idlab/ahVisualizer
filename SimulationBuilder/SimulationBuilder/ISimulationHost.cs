using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.ServiceModel.Web;
using System.Text;

namespace SimulationBuilder
{
    [ServiceContract]
    public interface ISimulationHost
    {
        [OperationContract]
        [WebGet]
        SimulationJob GetSimulationJob(string hostname);

        [OperationContract]
        [WebGet]
        void SimulationJobDone(string simulationBatchGUID, string hostname, int index, long elapsedTicks);

        [OperationContract]
        [WebGet]
        void SimulationJobFailed(string simulationBatchGUID, string hostname, int index, string error);

        [OperationContract]
        [WebGet(ResponseFormat = WebMessageFormat.Json)]
        Status GetStatus();

        [OperationContract]
        [WebGet(UriTemplate = "/")]
        Stream StatusPage();
    }

    public class Status
    {
        public Status()
        {
            JobStatus = new List<JobStatusEnum>();
        }
        public string SimulationBatchGUID { get; set; }

        public DateTime StartedOn { get; set; }

        [IgnoreDataMember]
        public TimeSpan TotalTime { get; set; }

        public string AverageTime
        {
            get
            {
                if (NrOfSimulationsDone == 0)
                    return "";
                else
                    return TimeSpan.FromTicks((int)(TotalTime.Ticks / (float)NrOfSimulationsDone)).ToString();
            }
            set { } // required to be picked up by WCF
        }
        public string RemainingTime
        {
            get
            {
                if (NrOfSimulationsDone == 0)
                    return "";
                else
                {
                    var remaining = TotalNrOfSimulations - NrOfSimulationsDone;
                    var ts = TimeSpan.FromTicks((int)(TotalTime.Ticks / (float)NrOfSimulationsDone * remaining));
                    return ts.ToString();
                }
            }
            set { } // required to be picked up by WCF
        }

        public int NrOfSimulationsDone { get; set; }
        public int TotalNrOfSimulations { get; set; }

        public List<JobStatusEnum> JobStatus { get; set; }
        public enum JobStatusEnum
        {
            Pending = 0,
            Running = 1,
            Finished = 2,
            Failed = 3
        }
    }

    public class SimulationJob
    {
        public string SimulationBatchGUID { get; set; }

        public int Index { get; set; }

        public int TotalNrOfSimulations { get; set; }

        public Dictionary<string, string> FinalArguments { get; set; }
    }
}
