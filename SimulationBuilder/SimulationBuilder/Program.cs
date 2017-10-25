using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.Linq;
using System.ServiceModel;
using System.Text;
using RunTimeDebuggers.Helpers;

namespace SimulationBuilder
{
    class Program
    {

        static void Main(string[] args)
        {
            //if (System.Diagnostics.Debugger.IsAttached)
              //  args = new string[] { "--slave", "http://localhost:12345/SimulationHost/" };
            if (args.Any(a => a.Contains("--slave")))
            {
                ProgramSlave.MainSlave(args);
            }
            else
                ProgramHost.MainHost(args);
        }

   
    }
}
