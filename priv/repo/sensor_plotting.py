# Routines to create plots from input data associated with specific types of sensors.


import numpy as np
import scipy.signal as signal
import matplotlib.pyplot as plt
import nptdms
import json
import os
from datetime import datetime


# Thermocouple plot:  Line plot of input data converted to F.


def thermocouple_plot(
    subsampled_data,
    start_timestamp,
    sampling_rate,
    sensor_description,
    output_png_path=None,
):
    temperature_data = subsampled_data * 9 / 5 + 32
    timeaxis = np.arange(subsampled_data.shape[0]) / sampling_rate / 60
    dt_ticks = 0.5  # min
    plt.figure(figsize=(14, 7))
    plt.plot(timeaxis, temperature_data, linewidth=2)
    plt.xticks(np.arange(timeaxis[0], timeaxis[-1] + dt_ticks / 2, dt_ticks))
    plt.xlabel(f"Time (mins) since {start_timestamp}")
    plt.ylabel("Temperature (deg F)")
    plt.title(sensor_description)
    plt.grid()
    print(output_png_path)
    if output_png_path is not None:
        plt.savefig(output_png_path)
        plt.close()
        return output_png_path


# Accelerometer Time Plot:  Line plot of raw sampled data (Strength of input)


def accelerometer_time_plot(
    subsampled_data, start_timestamp, sampling_rate, sensor_description, output_png_path
):
    timeaxis = np.arange(subsampled_data.shape[0]) / sampling_rate
    subsampled_data -= np.mean(subsampled_data)  # Remove DC component

    # Combine multiple time bins together (ie averaging)
    t_chunk = 0.5  # sec
    Nstack = np.max([int(t_chunk * sampling_rate), 1])
    Nbins = subsampled_data.shape[0] // Nstack
    subsampled_data = np.reshape(
        subsampled_data[: (Nstack * Nbins)], [Nstack, Nbins], order="F"
    )
    timeaxis = np.reshape(timeaxis[: (Nstack * Nbins)], [Nstack, Nbins], order="F")
    # RMS for data, avg for time axis
    subsampled_data = np.sqrt(np.mean(subsampled_data**2, axis=0))
    timeaxis = timeaxis[0, :]  # np.mean(timeaxis,axis=0)

    dt_ticks = 5  # (sec)
    plt.figure(figsize=(14, 7))
    plt.plot(timeaxis, subsampled_data, linewidth=2)
    plt.xticks(np.arange(timeaxis[0], timeaxis[-1] + dt_ticks / 2, dt_ticks))
    plt.xlabel(f"Time (sec) since {start_timestamp}")
    plt.ylabel("Signal strength (g's)")
    plt.yscale("log")
    # plt.ylim([10**-6, 10**0])
    plt.title(sensor_description)
    plt.grid()
    if output_png_path is not None:
        plt.savefig(output_png_path)
        plt.close()
        return output_png_path


# Accelerometer frequency plot:  Line plot of data that has has a spectrogram and shows average values.


def accelerometer_freq_plot(
    subsampled_data, sampling_rate, sensor_description, output_png_path
):
    Ttotal = subsampled_data.shape[0] / sampling_rate

    # Do a spectrogram, and average across time
    t_window = 1  # sec
    t_window = min([
        t_window,
        Ttotal,
    ])  # Trim down to <1 sec if that's all that's fed in
    Nwindow = int(t_window * sampling_rate / 2) * 2  # Force window to be even
    window = signal.windows.hann(Nwindow, sym=True)
    (fvec, _, s) = signal.spectrogram(
        subsampled_data[:, np.newaxis],
        sampling_rate,
        window,
        nfft=Nwindow,
        noverlap=Nwindow // 2,
        return_onesided=True,
        scaling="spectrum",
        axis=0,
    )
    s = np.transpose(s, axes=[0, 2, 1])  # Units = g^2
    psd = np.sqrt(np.mean(s, axis=1))  # Units = g's

    df_ticks = 1  # kHz
    plt.figure(figsize=(14, 7))
    plt.plot(fvec / 1e3, psd, linewidth=2)
    plt.xticks(np.arange(fvec[0] / 1e3, fvec[-1] / 1e3 + df_ticks / 2, df_ticks))
    plt.xlabel("Frequency (kHz)")
    plt.ylabel("Signal spectrum (g's)")
    plt.yscale("log")
    # plt.ylim([10**-8, 10**-1])
    plt.title(sensor_description)
    plt.grid()
    if output_png_path is not None:
        plt.savefig(output_png_path)
        plt.close()
        return output_png_path


# Electromagnetic Time Plot:  Line plot of raw sampled data (Strength of input)


def electromagnetic_time_plot(
    subsampled_data, start_timestamp, sampling_rate, sensor_description, output_png_path
):
    timeaxis = np.arange(subsampled_data.shape[0]) / sampling_rate
    subsampled_data -= np.mean(subsampled_data)  # Remove DC component

    # Combine multiple time bins together (ie averaging)
    t_chunk = 0.1  # sec
    Nstack = np.max([int(t_chunk * sampling_rate), 1])
    Nbins = subsampled_data.shape[0] // Nstack
    subsampled_data = np.reshape(
        subsampled_data[: (Nstack * Nbins)], [Nstack, Nbins], order="F"
    )
    timeaxis = np.reshape(timeaxis[: (Nstack * Nbins)], [Nstack, Nbins], order="F")
    # RMS for data, avg for time axis
    subsampled_data = 10 * np.log10(
        np.mean(subsampled_data**2, axis=0) / 50 / 1e-3
    )  # Convert to dBm
    timeaxis = timeaxis[0, :]  # np.mean(timeaxis,axis=0)

    dt_ticks = 5  # (sec)
    plt.figure(figsize=(14, 7))
    plt.plot(timeaxis, subsampled_data, linewidth=2)
    plt.xticks(np.arange(timeaxis[0], timeaxis[-1] + dt_ticks / 2, dt_ticks))
    plt.xlabel(f"Time (sec) since {start_timestamp}")
    plt.ylabel("Signal power (dBm at DAQ)")
    # plt.ylim([-130,-40])
    plt.title(sensor_description)
    plt.grid()
    if output_png_path is not None:
        plt.savefig(output_png_path)
        plt.close()
        return output_png_path


# Accelerometer frequency plot:  Line plot of data that has has a spectrogram and shows average values.


def electromagnetic_freq_plot(
    subsampled_data, sampling_rate, sensor_description, output_png_path
):
    Ttotal = subsampled_data.shape[0] / sampling_rate

    # Do a spectrogram, and average across time
    t_window = 0.01  # sec
    t_window = min([
        t_window,
        Ttotal,
    ])  # Trim down to <1 sec if that's all that's fed in
    Nwindow = int(t_window * sampling_rate / 2) * 2  # Force window to be even
    window = signal.windows.hann(Nwindow, sym=True)
    (fvec, _, s) = signal.spectrogram(
        subsampled_data[:, np.newaxis],
        sampling_rate,
        window,
        nfft=Nwindow,
        noverlap=Nwindow // 2,
        return_onesided=True,
        scaling="spectrum",
        axis=0,
    )
    s = np.transpose(s, axes=[0, 2, 1])  # Units = volt^2
    psd = 10 * np.log10(np.mean(s, axis=1) / 50 / 1e-3)  # Units = dBm

    df_ticks = 100  # kHz
    plt.figure(figsize=(14, 7))
    plt.plot(fvec / 1e3, psd, linewidth=2)
    plt.xticks(np.arange(fvec[0] / 1e3, fvec[-1] / 1e3 + df_ticks / 2, df_ticks))
    plt.xlabel("Frequency (kHz)")
    plt.ylabel(f"Signal power (dBm at DAQ input, rbw = {1 / t_window / 2:2.0f} Hz)")
    # plt.ylim([-130, -40])
    plt.title(sensor_description)
    plt.grid()
    if output_png_path is not None:
        plt.savefig(output_png_path)
        plt.close()
        return output_png_path


#   ***** Following is testing and sample methods  ******


def sample(path):
    path = path.decode("utf-8")
    dirname = os.path.expanduser("~")
    time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with nptdms.TdmsFile.open(path) as tdms_file:
        for group in tdms_file.groups():
            for channel in group.channels():
                sampling_rate = np.round(
                    1 / channel.properties["wf_increment"], decimals=3
                )

                start_timestamp = (
                    str(channel.properties["wf_start_time"])
                    .replace("T", " -- ")
                    .split(".")[0]
                )

                # Choose where to save the plots
                output_png_path = os.path.join(
                    dirname,
                    "deeplynx",
                    "graphs",
                    f"{channel.name.replace('/', '-')}-{time}.png",
                )

                # Choose which plots to create
                plt.rcParams.update({"font.size": 16})
                if "_th" in path:
                    t_skip = 0.5  # seconds
                    Nsubsample_skip = np.max([int(t_skip * sampling_rate), 1])
                    data_subsample_skip = np.array(channel[::Nsubsample_skip])
                    # output_png_path = output_png_folder + "timeplot.png"
                    thermocouple_plot(
                        data_subsample_skip,
                        start_timestamp,
                        sampling_rate / Nsubsample_skip,
                        channel.name,
                        output_png_path,
                    )

                elif "_acc" in path:
                    t_duration = 1
                    Ncontinuous = np.min([
                        int(t_duration * sampling_rate),
                        len(channel),
                    ])  # Force to be <= len(channel)
                    Ncontinuous = (
                        int(Ncontinuous / 2) * 2
                    )  # Force to be even (better for FFTs)
                    data_subsample_continuous = np.array(channel[0:Ncontinuous])
                    # output_png_path = output_png_folder + "freqplot.png"
                    accelerometer_freq_plot(
                        data_subsample_continuous,
                        sampling_rate,
                        channel.name,
                        output_png_path,
                    )

                    t_skip = 0  # seconds (set to zero to load everything)
                    Nsubsample_skip = np.max([int(t_skip * sampling_rate), 1])
                    data_subsample_skip = np.array(channel[::Nsubsample_skip])
                    # output_png_path = output_png_folder + "timeplot.png"
                    accelerometer_time_plot(
                        data_subsample_skip,
                        start_timestamp,
                        sampling_rate / Nsubsample_skip,
                        channel.name,
                        output_png_path,
                    )

                elif "_eh" in path:
                    t_duration = 0.1  # sec (set to len(channel)/sampling_rate to load everything)
                    Ncontinuous = np.min([
                        int(t_duration * sampling_rate),
                        len(channel),
                    ])  # Force to be <= len(channel)
                    Ncontinuous = (
                        int(Ncontinuous / 2) * 2
                    )  # Force to be even (better for FFTs)
                    data_subsample_continuous = np.array(channel[0:Ncontinuous])
                    # output_png_path = output_png_folder + "freqplot.png"
                    electromagnetic_freq_plot(
                        data_subsample_continuous,
                        sampling_rate,
                        channel.name,
                        output_png_path,
                    )

                    t_skip = 0.01  # seconds (set to zero to load everything)
                    Nsubsample_skip = np.max([int(t_skip * sampling_rate), 1])
                    data_subsample_skip = np.array(channel[::Nsubsample_skip])
                    # output_png_path = output_png_folder + "timeplot.png"
                    electromagnetic_time_plot(
                        data_subsample_skip,
                        start_timestamp,
                        sampling_rate / Nsubsample_skip,
                        channel.name,
                        output_png_path,
                    )

        tdms_file.close()
        return json.dumps([])
