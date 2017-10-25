using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.Linq;
using System.Text;

namespace SimulationBuilder
{
    public class SimulationManager
    {


        public static void BuildAndRunSimulation(string nssFolder, Dictionary<string, string> baseArgs, List<Dictionary<string, string>> combos, int i)
        {
            Console.WriteLine("Running simulation " + (i + 1) + "/" + combos.Count);



            var finalArguments = Merge(baseArgs, combos[i]);
            string name = GetName(combos[i]);
            var destinationPath = System.IO.Path.Combine(nssFolder, name + ".nss");


            finalArguments["--NSSFile"] = "\"" + destinationPath + "\"";
            finalArguments["--Name"] = "\"" + name + "\"";
            // finalArguments["--VisualizerIP"] = "\"" + "\""; // no visualization 

            if (!System.IO.File.Exists(System.IO.Path.Combine(nssFolder, name + ".nss")))
            {
                Stopwatch sw = new Stopwatch();
                sw.Start();
                RunSimulation(finalArguments);
                sw.Stop();
                Console.WriteLine("Simulation " + (i + 1) + " took " + sw.ElapsedMilliseconds + "ms");



            }
            else
            {
                Console.WriteLine("Skipping simulation " + (i + 1) + " because the nss file was already present");
            }
        }


        public static string GetName(Dictionary<string, string> combo)
        {
            //if (combo["--TrafficType"].Replace("\"", "") == "tcpsensor" && ConfigurationManager.AppSettings["legacyNamingScheme"] == "1")
            //{
            //    // forgot to sort before, be compatible with sensor results
            //    return string.Join("", "SensorMeasurementSize" + combo["--SensorMeasurementSize"].Replace("\"", "") +
            //                    "NRawSlotNum" + combo["--NRawSlotNum"].Replace("\"", "") +
            //                    "ContentionPerRAWSlot" + combo["--ContentionPerRAWSlot"].Replace("\"", "") +
            //                    "NGroup" + combo["--NGroup"].Replace("\"", "") +
            //                    "TrafficInterval" + combo["--TrafficInterval"].Replace("\"", ""));
            //}
            //else
                return string.Join("", combo.OrderBy(p => p.Key).Select(p => p.Key.Replace("--", "") + p.Value)).Replace("\"", "");
        }


        private static object fsLock = new object();

        public static void RunSimulation(Dictionary<string, string> args)
        {


            // use a tmp file on the local disk to store the simulation in
            // due to the huge number of appending done in the simulation it's verrrrrrrrrrry slow 
            // when done over the network
            // If the nss file is saved as a local temporary file and moved in bulk to the destination 
            // when it's done it will be much MUCH faster

            string tmpFile;
            string originalDestination;
            lock (fsLock) // prevent from claiming the same filename in concurrency
            {
                tmpFile = System.IO.Path.GetTempFileName() + ".nss";
            }

            Console.WriteLine("Changing nss file location to " + tmpFile);
            originalDestination = args["--NSSFile"].Replace("\"", "");

            if (System.IO.File.Exists(originalDestination))
            {
                Console.WriteLine("File already exists, skipping");
                return;
            }

            args["--NSSFile"] = "\"" + tmpFile + "\"";

            var argsStr = string.Join(" ", args.Select(p => p.Key + "=" + p.Value));

            ProcessStartInfo ps = new ProcessStartInfo()
            {
                FileName = ConfigurationManager.AppSettings["simulation"],
                Arguments = "\"" + argsStr.Replace("\"", "\\\"") + "\"",
                UseShellExecute = false, // System.Environment.OSVersion.Platform == PlatformID.Unix ? false : true,
                RedirectStandardError = true,
                RedirectStandardInput = true,
                RedirectStandardOutput = true
            };

            Console.WriteLine("Starting process " + ps.FileName + " " + ps.Arguments);

            Process proc;
            lock (fsLock)
            {
                proc = Process.Start(ps);
                System.Threading.Thread.Sleep(1000); // force 1sec between process starts or the .waf will get corrupted eventually. Sleep within the lock prevents other threads
                // from entering the lock until the sleep has passed
            }

            if (proc != null)
            {
                using (proc)
                {
                    var error = proc.StandardError.ReadToEnd();
                    var output = proc.StandardOutput.ReadToEnd();
                    proc.WaitForExit();

                    Console.WriteLine("Process ended with exit code " + proc.ExitCode);
                    if (!string.IsNullOrEmpty(error))
                    {
                        Console.WriteLine("Error: " + error);
                        throw new Exception(error);
                    }
                }
            }

            Console.WriteLine("Moving nss file to destination " + originalDestination);
            System.IO.File.Move(tmpFile, originalDestination);

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
