import argparse
import sys
import time
import os
from colorama import init, Fore, Style
import pyfiglet


init()

def print_banner():
    os.system('clear' if os.name == 'posix' else 'cls')
    
    banner = """
██╗    ██╗ █████╗ ██████╗ ███╗   ██╗███████╗████████╗
██║    ██║██╔══██╗██╔══██╗████╗  ██║██╔════╝╚══██╔══╝
██║ █╗ ██║███████║██████╔╝██╔██╗ ██║█████╗     ██║   
██║███╗██║██╔══██║██╔══██╗██║╚██╗██║██╔══╝     ██║   
╚███╔███╔╝██║  ██║██║  ██║██║ ╚████║███████╗   ██║   
 ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝  
"""
    
    print(Fore.CYAN + banner + Style.RESET_ALL)
    print(Fore.GREEN + "\t\t\t\t\tffoster007" + Style.RESET_ALL)
    print()
    print(Fore.MAGENTA + "WARNET" + Style.RESET_ALL)
    print()
    print(Fore.MAGENTA + "\tIt is the end user's responsibility to obey all applicable laws." + Style.RESET_ALL)
    print(Fore.MAGENTA + "\tIt is just like a server testing script and Your ip is visible. Please, make sure you are anonymous!" + Style.RESET_ALL)
    print()

def print_usage():

    usage_text = f"""
{Fore.YELLOW}Usage : python3 warnet.py [-s] [-p] [-t] [-q]{Style.RESET_ALL}
{Fore.CYAN}-h : -help{Style.RESET_ALL}
{Fore.CYAN}-s : -server_ip{Style.RESET_ALL}
{Fore.CYAN}-p : -port default 80{Style.RESET_ALL}
{Fore.CYAN}-q : -quiet{Style.RESET_ALL}

{Fore.CYAN}-t : -turbo default 135 or 443{Style.RESET_ALL}
"""
    print(usage_text)

def main():
    parser = argparse.ArgumentParser(description='DDoS Ripper - Network Testing Tool', add_help=False)
    
    
    parser.add_argument('-h', '--help', action='store_true', help='Show help message')
    parser.add_argument('-s', '--server', type=str, help='Target server IP')
    parser.add_argument('-p', '--port', type=int, default=80, help='Target port (default: 80)')
    parser.add_argument('-t', '--turbo', type=int, choices=[135, 443], help='Turbo mode (135 or 443)')
    parser.add_argument('-q', '--quiet', action='store_true', help='Quiet mode')
    
    
    if not any(arg in sys.argv for arg in ['-q', '--quiet']):
        print_banner()
    
    
    args = parser.parse_args()
    
    
    if args.help or len(sys.argv) == 1:
        print_usage()
        return
    
    
    if not args.server:
        print(f"{Fore.RED}Error: Server IP is required. Use -s to specify target.{Style.RESET_ALL}")
        return
    
    
    if not args.quiet:
        print(f"{Fore.GREEN}Target Server: {args.server}{Style.RESET_ALL}")
        print(f"{Fore.GREEN}Target Port: {args.port}{Style.RESET_ALL}")
        if args.turbo:
            print(f"{Fore.GREEN}Turbo Mode: {args.turbo}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}Starting DDoS Attack...{Style.RESET_ALL}")

    
    try:
        for i in range(10):
            if not args.quiet:
                print(f"{Fore.CYAN}DDoS Attack in {i+1}/10...{Style.RESET_ALL}")
            time.sleep(1)
        
        if not args.quiet:
            print(f"{Fore.GREEN}DDoS Attack completed.{Style.RESET_ALL}")

    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}DDoS Attack interrupted by user.{Style.RESET_ALL}")
    except Exception as e:
        print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")

if __name__ == "__main__":
    main()