using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.ServiceModel;
using System.Text;
using RunTimeDebuggers.Helpers;

namespace SimulationBuilder
{
    class ProgramHost
    {
        private static ServiceHost host;
        private static SimulationHost simhost;

        public static void MainHost(string[] args)
        {
            if (args.Length < 3)
            {
                Console.WriteLine("USAGE: SimulationBuilder baseConfiguration buildConfiguration nssFolder [--host]");
                return;
            }

            string baseConfig = args[0];
            string buildConfig = args[1];
            string nssFolder = args[2];

            if (!System.IO.File.Exists(baseConfig))
            {
                Console.Error.WriteLine("Base configuration file " + baseConfig + " not found");
                return;
            }

            if (!System.IO.File.Exists(buildConfig))
            {
                Console.Error.WriteLine("Build configuration file " + baseConfig + " not found");
                return;
            }

            //if (args.Any(a => a == "--host"))
            //{
            //    if (!System.IO.Directory.Exists(nssFolder))
            //    {
            //        Console.Error.WriteLine("Output nss folder " + nssFolder + " not found");
            //        return;
            //    }
            //}



            var baseArgs = GetArguments(baseConfig);

            var customArgs = GetArguments(buildConfig);

            Console.WriteLine("Building combinations");
            var combos = GetCombinations(customArgs, customArgs.Keys.ToList()).ToList();

            if (ConfigurationManager.AppSettings["randomizeCombos"] == "0")
            {
                // don't randomize
            }
            else
            {
                // shuffle combos so larger ones are mixed with shorter simulations, this way even though
                // the large ones will take huge amounts of time all servers won't work on all these large ones at the same time
                Shuffle(combos);
            }

            if (args.Any(a => a.Contains("--host")))
            {
                Console.WriteLine(combos.Count + " combinations build, hosting WCF");
                simhost = new SimulationHost(nssFolder, baseArgs, combos);


                ServiceHost host = new ServiceHost(simhost);
                host.Faulted += Host_Faulted;
                host.Open();

                AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;
                Console.Read();
            }
            else
            {
                RunCombinations(nssFolder, baseArgs, combos);
            }
        }

        private static void Shuffle<T>(List<T> array)
        {
            var rnd = new Random();
            int n = array.Count;
            for (int i = 0; i < n; i++)
            {
                int r = i + (int)(rnd.NextDouble() * (n - i));
                T t = array[r];
                array[r] = array[i];
                array[i] = t;
            }
        }


        private static void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Console.WriteLine("Unhandled exception: " + e.ExceptionObject);
        }

        private static void Host_Faulted(object sender, EventArgs e)
        {
            try
            {
                if (host != null)
                    host.Close();
            }
            catch (Exception ex)
            { }

            host = new ServiceHost(simhost);
            host.Open();
        }

        private static void RunCombinations(string nssFolder, Dictionary<string, string> baseArgs, List<Dictionary<string, string>> combos)
        {
            int maxParallel;
            if (!int.TryParse(ConfigurationManager.AppSettings["maxParallel"], out maxParallel))
                maxParallel = Environment.ProcessorCount;
            TaskFactory factory = new TaskFactory(maxParallel, System.Threading.ThreadPriority.Normal);

            for (int idx = 0; idx < combos.Count; idx++)
            {
                var i = idx;
                factory.StartTask(() =>
                {
                    try
                    {
                        SimulationManager.BuildAndRunSimulation(nssFolder, baseArgs, combos, i);
                    }
                    catch (Exception ex)
                    {
                        Console.Error.Write("Error: " + ex.GetType().FullName + " - " + ex.Message + Environment.NewLine + ex.StackTrace);
                    }
                }, () =>
                {

                });
            }

            factory.WaitAll();
        }

        private static IEnumerable<Dictionary<string, string>> GetCombinations(Dictionary<string, string> customArgs, List<string> keys, int i = 0)
        {
            if (i >= keys.Count)
            {
                yield return new Dictionary<string, string>();
                yield break;
            }

            var values = customArgs[keys[i]].Split(',');
            foreach (var val in values.Where(v => !string.IsNullOrEmpty(v)).Select(v => v.Replace("\"", "")))
            {

                var subCombinations = GetCombinations(customArgs, keys, i + 1);
                foreach (var subCombo in subCombinations)
                {
                    if (values.Contains("\""))
                        subCombo[keys[i]] = "\"" + val + "\"";
                    else
                        subCombo[keys[i]] = val;
                    yield return subCombo;
                }
            }
        }

        private static Dictionary<string, string> GetArguments(string file)
        {
            Dictionary<string, string> args = new Dictionary<string, string>();
            var lines = System.IO.File.ReadAllLines(file);
            foreach (var l in lines)
            {
                if (!string.IsNullOrWhiteSpace(l) && !l.Trim().StartsWith("#"))
                {
                    var parts = l.Split('=');
                    if (parts.Length >= 2)
                    {
                        string key = parts[0];
                        string value = l.Substring(key.Length + 1);
                        args[key] = value;
                    }
                }
            }
            return args;
        }
    }
}
